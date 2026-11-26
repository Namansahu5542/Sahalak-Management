-- Step 2 of 2: run ONLY after script/migrate-shop-images.mjs has finished.
-- Refuses to run if any shop still has bytes but no Storage file.
do $$
begin
  if exists (select 1 from shops where image_data is not null and image_path is null) then
    raise exception 'Some shops still have image_data without image_path. Run the backfill script first.';
  end if;
end $$;

alter table shops drop column image_data;