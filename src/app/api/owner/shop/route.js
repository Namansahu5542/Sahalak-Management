import { NextResponse } from "next/server";
import { auth, unstable_update } from "@/app/lib/auth/auth";
import { sql } from "@/app/lib/db";
import { shopSetupSchema } from "@/app/lib/validation/shop";

const CONNECTION_ERRORS = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

export async function POST(request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !UUID_PATTERN.test(userId)) {
    return NextResponse.json({ error: "Please sign in again to continue." }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    if (error?.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "Please sign in again to continue." }, { status: 401 });
    }
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

  const photo = parsed.data.photo;
  const imageBytes = Buffer.from(await photo.arrayBuffer());
  const detectedType = getImageTypeFromBytes(imageBytes);
  if (detectedType !== photo.type) {
    return NextResponse.json({ error: "The uploaded file does not match its image type.", fieldErrors: { photo: "Choose a valid JPG, PNG, or WebP image." } }, { status: 400 });
  }

  await sql.begin(async (tx) => {
    const updated = await tx`
    update users set role = 'owner', owner_activated_at = now()
    where id = ${userId}
    returning id`;
    if (updated.length === 0) throw new Error("USER_NOT_FOUND");

    await tx`
    insert into shops (
      owner_id, owner_name, shop_name, market_name, address, category, phone,
      image_data, image_content_type, image_file_name, image_size, updated_at
    )
    values (
      ${userId}, ${ownerName}, ${shopName}, ${marketName}, ${address}, ${category}, ${phone},
      ${imageBytes}, ${detectedType}, ${fileName}, ${imageBytes.length}, now()
    )
    on conflict (owner_id) do update set
      owner_name = excluded.owner_name,
      shop_name = excluded.shop_name,
      market_name = excluded.market_name,
      address = excluded.address,
      category = excluded.category,
      phone = excluded.phone,
      image_data = excluded.image_data,
      image_content_type = excluded.image_content_type,
      image_file_name = excluded.image_file_name,
      image_size = excluded.image_size,
      updated_at = now()`;
  });
  const ownerName = session.user.name || "";
  const fileName = photo.name.split(/[\\/]/).pop().slice(0, 100);
  const { shopName, marketName, address, category, phone } = parsed.data;

  try {
    await sql.begin(async (tx) => {
      // GitHub sign-ins have no users row yet, so create it (or update the existing one) and get its id.
      const [owner] = await tx`
        insert into users (email, name, role, owner_activated_at)
        values (${email}, ${ownerName}, 'owner', now())
        on conflict (email) do update set role = 'owner', owner_activated_at = now()
        returning id`;

      await tx`
        insert into shops (
          owner_id, owner_name, shop_name, market_name, address, category, phone,
          image_data, image_content_type, image_file_name, image_size, updated_at
        )
        values (
          ${owner.id}, ${ownerName}, ${shopName}, ${marketName}, ${address}, ${category}, ${phone},
          ${imageBytes}, ${detectedType}, ${fileName}, ${imageBytes.length}, now()
        )
        on conflict (owner_id) do update set
          owner_name = excluded.owner_name,
          shop_name = excluded.shop_name,
          market_name = excluded.market_name,
          address = excluded.address,
          category = excluded.category,
          phone = excluded.phone,
          image_data = excluded.image_data,
          image_content_type = excluded.image_content_type,
          image_file_name = excluded.image_file_name,
          image_size = excluded.image_size,
          updated_at = now()`;
    });

    try {
      await unstable_update({ user: { role: "owner" } });
    } catch (sessionError) {
      console.error("Shop was saved but the owner session refresh failed", sessionError?.name || "UnknownError");
    }

    return NextResponse.json({ message: "Shop details saved.", shopName });
  } catch (error) {
    const code = error?.code || "";
    const safeMessage = String(error?.message || "").replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]");
    console.error("Could not save owner shop details", { name: error?.name, code, message: safeMessage });

    if (code === "23505") return NextResponse.json({ error: "A shop profile is already linked to this account." }, { status: 409 });
    if (code === "23514" || code === "23502" || code === "22001") {
      return NextResponse.json({ error: "Some shop details did not pass database validation. Review the form." }, { status: 400 });
    }
    if (CONNECTION_ERRORS.has(code)) {
      return NextResponse.json({ error: "Could not connect to the database. Check DATABASE_URL, your network, and the database status." }, { status: 503 });
    }
    const message = process.env.NODE_ENV === "development"
      ? `Shop details could not be saved (${error?.name || "UnknownError"}). Check the terminal log for details.`
      : "Could not save your shop details right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}