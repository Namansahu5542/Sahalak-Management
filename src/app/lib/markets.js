import "server-only";
import { sql } from "@/app/lib/db";

// Result columns arrive in camelCase (areaName, laneName, ...): the db client converts them.

/** Markets people can see. Pass includeDraft for the owner form, where owners may register in a market before it goes live. */
export async function getMarkets({ includeDraft = false } = {}) {
  return sql`
    select m.id, m.name, m.slug, m.status, a.name as area_name, a.city
    from markets m
    join areas a on a.id = m.area_id
    where m.status = 'active' or (${includeDraft}::boolean and m.status = 'draft')
    order by a.city, a.name, m.name`;
}

export async function getMarketBySlug(slug, { includeDraft = false } = {}) {
  const [market] = await sql`
    select m.id, m.name, m.slug, m.status, a.name as area_name, a.city
    from markets m
    join areas a on a.id = m.area_id
    where m.slug = ${slug}
      and (m.status = 'active' or (${includeDraft}::boolean and m.status = 'draft'))
    limit 1`;
  return market ?? null;
}

/** Every stall of a market with its location and whether a shop already holds it. */
export async function getMarketStalls(marketId) {
  return sql`
    select s.id, s.stall_no, s.side,
           l.id as lane_id, l.name as lane_name,
           z.id as zone_id, z.name as zone_name,
           (ss.shop_id is not null) as taken
    from stalls s
    join lanes l on l.id = s.lane_id
    left join zones z on z.id = l.zone_id
    left join shop_stalls ss on ss.stall_id = s.id
    where s.market_id = ${marketId}
    order by z.sort_order nulls last, l.sort_order,
             nullif(regexp_replace(s.stall_no, '\\D', '', 'g'), '')::int nulls last, s.stall_no`;
}

export async function getCategories() {
  return sql`select id, parent_id, name, slug from categories order by sort_order, name`;
}

// Escape LIKE wildcards so a search for "100%" matches the text, not everything.
const likePattern = (text) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;

/** Verified shops of a market, for the public market page. Filters are all optional. */
export async function listMarketShops({ marketId, q = null, categorySlug = null, zoneId = null, limit = 20, offset = 0 }) {
  const query = q?.trim() || null;
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const skip = Math.max(Number(offset) || 0, 0);

  return sql`
    select s.id, s.shop_name, s.image_url, s.phone, coalesce(loc.locations, '{}') as locations
    from shops s
    left join lateral (
      select array_agg(concat_ws(', ', z.name, l.name, 'Stall ' || st.stall_no) order by l.sort_order, st.stall_no) as locations
      from shop_stalls ss
      join stalls st on st.id = ss.stall_id
      join lanes l on l.id = st.lane_id
      left join zones z on z.id = l.zone_id
      where ss.shop_id = s.id
    ) loc on true
    where s.market_id = ${marketId}
      and s.status = 'verified'
      and (${query}::text is null
           or s.shop_name ilike ${query ? likePattern(query) : null}::text
           or similarity(s.shop_name, ${query}::text) > 0.3)
      and (${categorySlug}::text is null or exists (
            select 1 from shop_categories sc join categories c on c.id = sc.category_id
            where sc.shop_id = s.id and c.slug = ${categorySlug}::text))
      and (${zoneId}::uuid is null or exists (
            select 1 from shop_stalls ss2 join stalls st2 on st2.id = ss2.stall_id join lanes l2 on l2.id = st2.lane_id
            where ss2.shop_id = s.id and l2.zone_id = ${zoneId}::uuid))
    order by s.shop_name
    limit ${pageSize} offset ${skip}`;
}