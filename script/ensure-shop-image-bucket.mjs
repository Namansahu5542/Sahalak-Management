import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const bucketName = "shop-images";
const bucketOptions = {
  public: true,
  fileSizeLimit: 2 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
};

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or server-side Supabase service key.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing, error: lookupError } = await supabase.storage.getBucket(bucketName);

if (lookupError && lookupError.statusCode !== "404") {
  console.error("Could not inspect the shop image bucket.", lookupError.statusCode || lookupError.name);
  process.exit(1);
}

const result = existing
  ? await supabase.storage.updateBucket(bucketName, bucketOptions)
  : await supabase.storage.createBucket(bucketName, bucketOptions);

if (result.error) {
  console.error("Could not configure the shop image bucket.", result.error.statusCode || result.error.name);
  process.exit(1);
}

const { data: verified, error: verifyError } = await supabase.storage.getBucket(bucketName);
if (verifyError || !verified?.public) {
  console.error("Shop image bucket configuration could not be verified.", verifyError?.statusCode || "unexpected bucket settings");
  process.exit(1);
}

const probePath = `_setup-check/${randomUUID()}.png`;
const probeImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pS8AAAAASUVORK5CYII=",
  "base64",
);
const { error: uploadError } = await supabase.storage.from(bucketName).upload(probePath, probeImage, {
  contentType: "image/png",
  upsert: false,
});

if (uploadError) {
  console.error("Shop image bucket exists but upload verification failed.", uploadError.statusCode || uploadError.name);
  process.exit(1);
}

const { error: cleanupError } = await supabase.storage.from(bucketName).remove([probePath]);
if (cleanupError) {
  console.error("Upload verification passed, but the temporary probe image could not be removed.", cleanupError.statusCode || cleanupError.name);
  process.exit(1);
}

console.info("Configured shop-images and verified upload/delete for JPG, PNG, and WebP up to 2 MB.");
