import { ROLES, withRole } from "@/app/lib/auth/require-role";
import { sql } from "@/app/lib/db";
import { uploadShopImage, deleteShopImage, ShopImageStorageError } from "@/app/lib/storage/shop-images";
import { shopSetupSchema } from "@/app/lib/validation/shop";
import { unstable_update } from "@/app/lib/auth/auth";
import { NextResponse } from "next/server";

const CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
]);

function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  try {
    return Boolean(origin) && new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function getImageTypeFromBytes(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// Becoming an owner starts from a normal account, so "user" must be allowed here.
// Admins are excluded on purpose: this route would otherwise overwrite their role.
export const POST = withRole([ROLES.USER, ROLES.OWNER], async (request, { user }) => {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Submit the shop details as a form." }, { status: 400 });
  }

  const parsed = shopSetupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return NextResponse.json({ error: "Review the highlighted shop details.", fieldErrors }, { status: 400 });
  }

  const { shopName, marketName, address, category, phone, photo } = parsed.data;
  const imageBytes = Buffer.from(await photo.arrayBuffer());
  const detectedType = getImageTypeFromBytes(imageBytes);
  if (detectedType !== photo.type) {
    return NextResponse.json(
      { error: "The uploaded file does not match its image type.", fieldErrors: { photo: "Choose a valid JPG, PNG, or WebP image." } },
      { status: 400 },
    );
  }

  const ownerName = user.name || "";
  const fileName = photo.name.split(/[\\/]/).pop().slice(0, 100);

  let uploaded = null; // file we just stored; removed again if the database save fails
  let previousPath = null; // the shop's old file; removed after the new one is safely saved

  try {
    // 1) Upload first. A failure here leaves the database untouched.
    uploaded = await uploadShopImage({ ownerId: user.id, bytes: imageBytes, contentType: detectedType });

    // 2) One transaction: either the role change AND the shop are saved, or neither.
    await sql.begin(async (tx) => {
      const [existing] = await tx`select image_path from shops where owner_id = ${user.id} for update`;
      previousPath = existing?.imagePath ?? null;

      await tx`
        update users
        set role = 'owner', owner_activated_at = coalesce(owner_activated_at, now())
        where id = ${user.id}`;

      await tx`
        insert into shops (
          owner_id, owner_name, shop_name, market_name, address, category, phone,
          image_url, image_path, image_content_type, image_file_name, image_size, updated_at
        )
        values (
          ${user.id}, ${ownerName}, ${shopName}, ${marketName}, ${address}, ${category}, ${phone},
          ${uploaded.url}, ${uploaded.path}, ${detectedType}, ${fileName}, ${imageBytes.length}, now()
        )
        on conflict (owner_id) do update set
          owner_name = excluded.owner_name,
          shop_name = excluded.shop_name,
          market_name = excluded.market_name,
          address = excluded.address,
          category = excluded.category,
          phone = excluded.phone,
          image_url = excluded.image_url,
          image_path = excluded.image_path,
          image_content_type = excluded.image_content_type,
          image_file_name = excluded.image_file_name,
          image_size = excluded.image_size,
          updated_at = now()`;
    });

    // 3) Saved. The old file is now garbage.
    await deleteShopImage(previousPath);

    try {
      await unstable_update({ user: { role: "owner" } });
    } catch (sessionError) {
      console.error("Shop was saved but the owner session refresh failed", sessionError?.name || "UnknownError");
    }

    return NextResponse.json({ message: "Shop details saved.", shopName });
  } catch (error) {
    // The database save failed after the upload: don't leave an orphan file behind.
    if (uploaded) await deleteShopImage(uploaded.path);

    if (error instanceof ShopImageStorageError) {
      console.error("Shop image storage failed", { kind: error.kind, message: error.message });
      if (error.kind === "configuration") {
        return NextResponse.json({ error: "Shop image storage is not configured on the server." }, { status: 503 });
      }
      return NextResponse.json({ error: "Could not upload the shop image. Check the Storage bucket and try again." }, { status: 502 });
    }

    const code = error?.code || "";
    const safeMessage = String(error?.message || "").replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]");
    console.error("Could not save owner shop details", { name: error?.name, code, message: safeMessage });

    if (
      code === "42703" ||
      code === "42P01" ||
      (code === "23502" && error?.column === "image_data")
    ) {
      return NextResponse.json(
        { error: "Shop database schema is out of date. Apply db/003-shop-image-storage.sql, then retry." },
        { status: 503 },
      );
    }

    if (code === "23505") return NextResponse.json({ error: "A shop profile is already linked to this account." }, { status: 409 });
    if (code === "23514" || code === "23502" || code === "22001") {
      return NextResponse.json({ error: "Some shop details did not pass database validation. Review the form." }, { status: 400 });
    }
    if (CONNECTION_ERRORS.has(code)) {
      return NextResponse.json({ error: "Could not connect to the database. Check DATABASE_URL, your network, and the database status." }, { status: 503 });
    }
    const message =
      process.env.NODE_ENV === "development"
        ? `Shop details could not be saved (${error?.name || "UnknownError"}). Check the terminal log for details.`
        : "Could not save your shop details right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
