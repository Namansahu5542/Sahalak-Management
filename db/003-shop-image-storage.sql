-- Step 1 of 2: prepare shops for Storage-hosted images. Safe to run while the app is live.
alter table shops add column if not exists image_path text;  -- path inside the bucket, used to replace/delete the file
alter table shops add column if not exists image_url  text;  -- public URL shown in the UI

-- New rows no longer store bytes, so the old column must accept NULL.
alter table shops alter column image_data drop not null;