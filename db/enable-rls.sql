-- 007-enable-rls.sql: lock the original tables away from Supabase's public API.
-- Supabase exposes every public table over HTTP; without RLS, anyone holding the project's
-- public (anon) key could read or write them. The app is unaffected because DATABASE_URL
-- connects as the table owner, which bypasses RLS.
--
-- The guard stops the migration if the current role does NOT bypass RLS (the app would be locked out).
do $$
begin
  if not (select rolbypassrls or rolsuper from pg_roles where rolname = current_user) then
    raise exception 'Current role does not bypass RLS. Enabling it could lock the app out.';
  end if;
end $$;

alter table users           enable row level security;
alter table pending_signups enable row level security;
alter table shops           enable row level security;

-- If sign-in or shop saving breaks afterwards, undo with:
--   alter table <name> disable row level security;