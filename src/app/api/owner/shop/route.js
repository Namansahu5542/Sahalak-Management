import { NextResponse } from "next/server";
import { ROLES, withRole } from "@/app/lib/auth/require-role";
import { sql } from "@/app/lib/db";
import { saveOwnerShop, assertShopSelection, ShopFormError } from "@/app/lib/shops/owner-shop";
import { deleteShopImage, ShopImageStorageError, uploadShopImage } from "@/app/lib/storage/shop-images";
import { fieldErrorsFromIssues, shopFormToObject, shopSetupSchema } from "@/app/lib/validation/shop";
import { unstable_update } from "@/app/lib/auth/auth";

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

async function cleanupImage(path) {
  try {
    await deleteShopImage(path);
  } catch (error) {
    console.error("Shop image cleanup failed", { name: error?.name, code: error?.code });
  }
}

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

  const parsed = shopSetupSchema.safeParse(shopFormToObject(formData));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Review the highlighted shop details.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) },
      { status: 400 },
    );
  }

  const { photo } = parsed.data;
  const imageBytes = Buffer.from(await photo.arrayBuffer());
  const contentType = getImageTypeFromBytes(imageBytes);
  if (contentType !== photo.type) {
    return NextResponse.json(
      { error: "The uploaded file does not match its image type.", fieldErrors: { photo: "Choose a valid JPG, PNG, or WebP image." } },
      { status: 400 },
    );
  }

  let uploaded = null;
  try {
    // Reject invalid/taken selections before spending time uploading the image.
    // saveOwnerShop checks again inside the transaction to close race conditions.
    await assertShopSelection(sql, { ownerId: user.id, ...parsed.data });

    const fileName = photo.name.split(/[\\/]/).pop().slice(0, 100);
    uploaded = await uploadShopImage({ ownerId: user.id, bytes: imageBytes, contentType });
    const saved = await saveOwnerShop({
      user,
      data: parsed.data,
      image: { ...uploaded, contentType, fileName, size: imageBytes.length },
    });

    await cleanupImage(saved.previousImagePath);
    try {
      await unstable_update({ user: { role: "owner" } });
    } catch (sessionError) {
      console.error("Shop was saved but the owner session refresh failed", sessionError?.name || "UnknownError");
    }

    const message = saved.status === "pending" ? "Shop profile submitted for review." : "Shop details saved.";
    return NextResponse.json({ message, shopId: saved.shopId, status: saved.status });
  } catch (error) {
    if (uploaded) await cleanupImage(uploaded.path);

    if (error instanceof ShopFormError) {
      return NextResponse.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: error.status });
    }

    if (error instanceof ShopImageStorageError) {
      console.error("Shop image storage failed", { kind: error.kind, message: error.message });
      const status = error.kind === "configuration" ? 503 : 502;
      const message = error.kind === "configuration"
        ? "Shop image storage is not configured on the server."
        : "Could not upload the shop image. Check the Storage bucket and try again.";
      return NextResponse.json({ error: message }, { status });
    }

    const code = error?.code || "";
    const safeMessage = String(error?.message || "").replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]");
    console.error("Could not save owner shop details", { name: error?.name, code, message: safeMessage });

    if (code === "42703" || code === "42P01" || (code === "23502" && error?.column === "image_data")) {
      return NextResponse.json(
        { error: "Owner setup database schema is out of date. Apply db/003-shop-image-storage.sql and db/006-market.sql, then retry." },
        { status: 503 },
      );
    }
    if (code === "23505") return NextResponse.json({ error: "A shop profile or stall is already in use." }, { status: 409 });
    if (code === "23514" || code === "23502" || code === "22001") {
      return NextResponse.json({ error: "Some shop details did not pass database validation. Review the form." }, { status: 400 });
    }
    if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "CONNECT_TIMEOUT", "CONNECTION_CLOSED", "CONNECTION_DESTROYED", "CONNECTION_ENDED"].includes(code)) {
      return NextResponse.json({ error: "Could not connect to the database. Check DATABASE_URL and the database status." }, { status: 503 });
    }

    const message = process.env.NODE_ENV === "development"
      ? `Shop details could not be saved (${error?.name || "UnknownError"}). Check the server log for details.`
      : "Could not save your shop details right now. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
