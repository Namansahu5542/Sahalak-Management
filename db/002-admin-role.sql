-- Allow the 'admin' role. Run once in the Supabase SQL Editor.
-- (Assumes users.role is text with a CHECK constraint. If it is a Postgres enum,
--  run instead:  alter type <enum_name> add value if not exists 'admin';)

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table users drop constraint %I', c.conname);
  end loop;
end $$;

alter table users
  add constraint users_role_check check (role in ('user', 'owner', 'admin'));

-- Admins are created ONLY by hand, never through an API:
-- update users set role = 'admin' where email = 'you@example.com';