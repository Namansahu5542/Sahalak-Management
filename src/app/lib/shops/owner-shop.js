import "server-only";
import { sql } from "@/app/lib/db";

/** An error the owner can fix. The route turns it into a JSON response. */
export class ShopFormError extends Error {
  constructor(status, message, fieldErrors = {}) {
    super(message);
    this.name = "ShopFormError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Ensure the market, stall, and categories exist and the stall is free for this owner. */
export async function assertShopSelection(client, { ownerId, marketId, stallId, categoryIds }) {
  const uniqueCategoryIds = [...new Set(categoryIds)];
  const [stall] = await client`
    select st.id, ss.shop_id, sh.owner_id
    from stalls st
    join markets m on m.id = st.market_id and m.status in ('draft', 'active')
    left join shop_stalls ss on ss.stall_id = st.id
    left join shops sh on sh.id = ss.shop_id
    where st.id = ${stallId} and st.market_id = ${marketId}`;

  if (!stall) {
    throw new ShopFormError(400, "Choose a market and a stall that belong together.", {
      stallId: "Choose a stall in the selected market.",
    });
  }
  if (stall.shopId && stall.ownerId !== ownerId) {
    throw new ShopFormError(409, "That stall already belongs to another shop.", {
      stallId: "This stall is already taken. Choose another.",
    });
  }

  const found = await client`select id from categories where id = any(${uniqueCategoryIds}::uuid[])`;
  if (found.length !== uniqueCategoryIds.length) {
    throw new ShopFormError(400, "Review the categories.", { categoryIds: "Choose valid categories." });
  }
}

/** Atomically promotes the owner and saves the shop, stall claim, and categories. */
export async function saveOwnerShop({ user, data, image }) {
  const { shopName, address, phone, marketId, stallId } = data;
  const categoryIds = [...new Set(data.categoryIds)];

  try {
    return await sql.begin(async (tx) => {
      await assertShopSelection(tx, { ownerId: user.id, marketId, stallId, categoryIds });

      // Lock this owner's current shop so concurrent edits cannot release its stall twice.
      const [previous] = await tx`
        select s.id, s.market_id, s.image_path, ss.stall_id
        from shops s
        left join shop_stalls ss on ss.shop_id = s.id
        where s.owner_id = ${user.id}
        for update of s`;

      await tx`
        update users
        set role = 'owner', owner_activated_at = coalesce(owner_activated_at, now())
        where id = ${user.id}`;

      if (previous) await tx`delete from shop_stalls where shop_id = ${previous.id}`;

      // A new market/stall or a rejected shop must return to the review queue.
      const needsReview = Boolean(previous) && (previous.marketId !== marketId || previous.stallId !== stallId);

      const [shop] = await tx`
        insert into shops (
          owner_id, owner_name, shop_name, address, phone, market_id,
          image_url, image_path, image_content_type, image_file_name, image_size, updated_at
        )
        values (
          ${user.id}, ${user.name || ""}, ${shopName}, ${address}, ${phone}, ${marketId},
          ${image.url}, ${image.path}, ${image.contentType}, ${image.fileName}, ${image.size}, now()
        )
        on conflict (owner_id) do update set
          owner_name = excluded.owner_name,
          shop_name = excluded.shop_name,
          address = excluded.address,
          phone = excluded.phone,
          market_id = excluded.market_id,
          image_url = excluded.image_url,
          image_path = excluded.image_path,
          image_content_type = excluded.image_content_type,
          image_file_name = excluded.image_file_name,
          image_size = excluded.image_size,
          status = case when ${needsReview}::boolean or shops.status = 'rejected' then 'pending' else shops.status end,
          updated_at = now()
        returning id, status`;

      await tx`insert into shop_stalls (shop_id, stall_id, market_id) values (${shop.id}, ${stallId}, ${marketId})`;
      await tx`delete from shop_categories where shop_id = ${shop.id}`;
      await tx`insert into shop_categories (shop_id, category_id) select ${shop.id}, unnest(${categoryIds}::uuid[])`;

      return { shopId: shop.id, status: shop.status, previousImagePath: previous?.imagePath ?? null };
    });
  } catch (error) {
    // The unique stall constraint resolves two owners claiming the same stall at once.
    if (error?.code === "23505" && error?.constraint_name === "shop_stalls_stall_id_key") {
      throw new ShopFormError(409, "That stall was just taken by another shop.", {
        stallId: "This stall is already taken. Choose another.",
      });
    }
    throw error;
  }
}
