-- PLACEHOLDER LAYOUT for Para market, Rajajipuram. Replace with real survey data
-- (zone names, lane names, stall numbers) before the pilot. Safe to re-run.
-- Run after 006-markets.sql.

insert into areas (city, name, slug)
values ('Lucknow', 'Rajajipuram', 'rajajipuram')
on conflict (slug) do nothing;

-- Starts as 'draft': owners can register, customers cannot see it. An admin sets it to 'active' later.
insert into markets (area_id, name, slug, status)
select id, 'Para market', 'para-market', 'draft' from areas where slug = 'rajajipuram'
on conflict (slug) do nothing;

insert into zones (market_id, name, sort_order)
select m.id, z.name, z.ord
from markets m,
     (values ('Zone 1', 1), ('Zone 2', 2)) as z(name, ord)
where m.slug = 'para-market'
on conflict (market_id, name) do nothing;

insert into lanes (market_id, zone_id, name, sort_order)
select m.id, z.id, l.name, l.ord
from markets m
join (values ('Lane A', 'Zone 1', 1), ('Lane B', 'Zone 1', 2),
             ('Lane C', 'Zone 2', 3), ('Lane D', 'Zone 2', 4)) as l(name, zone_name, ord) on true
join zones z on z.market_id = m.id and z.name = l.zone_name
where m.slug = 'para-market'
on conflict (market_id, name) do nothing;

-- Twelve stalls per lane, odd numbers on the left, even on the right.
insert into stalls (market_id, lane_id, stall_no, side)
select l.market_id, l.id, n::text, case when n % 2 = 1 then 'left' else 'right' end
from lanes l
join markets m on m.id = l.market_id,
     generate_series(1, 12) as n
where m.slug = 'para-market'
on conflict (market_id, lane_id, stall_no) do nothing;

-- Attach shops that were registered with free-text "Para ..." as their market.
update shops
set market_id = m.id
from markets m
where m.slug = 'para-market'
  and shops.market_id is null
  and lower(trim(shops.market_name)) like 'para%';