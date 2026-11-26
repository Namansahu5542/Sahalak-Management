// One-time backfill: move existing bytea images into Supabase Storage.
// Run:  node --env-file=.env.local script/migrate-shop-images.mjs
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "shop-images";
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });
const supabase = createClient(process.env.SUPABASE_URL, (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rows = await sql`
  select owner_id, image_data, image_content_type
  from shops
  where image_data is not null and image_path is null`;

console.log(`Shops to migrate: ${rows.length}`);
let moved = 0;

for (const row of rows) {
  const extension = EXTENSIONS[row.image_content_type];
  if (!extension) {
    console.error(`Skipping ${row.owner_id}: unsupported type ${row.image_content_type}`);
    continue;
  }
  const path = `${row.owner_id}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, row.image_data, {
    contentType: row.image_content_type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error(`Upload failed for ${row.owner_id}: ${error.message}`);
    continue;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  await sql`update shops set image_path = ${path}, image_url = ${data.publicUrl} where owner_id = ${row.owner_id}`;
  moved += 1;
  console.log(`Moved ${row.owner_id}`);
}

console.log(`Done. Moved ${moved} of ${rows.length}.`);
await sql.end();