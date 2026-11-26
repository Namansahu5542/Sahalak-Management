import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "shop-images";
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

let client;

export class ShopImageStorageError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "ShopImageStorageError";
    this.kind = kind;
  }
}

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ShopImageStorageError("configuration", "Missing Supabase Storage configuration.");
  }
  try {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch {
    throw new ShopImageStorageError("configuration", "Supabase Storage configuration is invalid.");
  }
  return client;
}

export async function uploadShopImage({ ownerId, bytes, contentType }) {
  const extension = EXTENSIONS[contentType];
  if (!extension) throw new ShopImageStorageError("validation", "Unsupported image type.");
  const path = `${ownerId}/${randomUUID()}.${extension}`;
  const supabase = getClient();
  let error;
  try {
    ({ error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    }));
  } catch (uploadError) {
    throw new ShopImageStorageError("upload", uploadError?.message || "Storage request failed.");
  }
  if (error) {
    throw new ShopImageStorageError("upload", error.message);
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function deleteShopImage(path) {
  if (!path) return;
  const { error } = await getClient().storage.from(BUCKET).remove([path]);
  if (error) console.error("Could not delete old shop image", error.message);
}
