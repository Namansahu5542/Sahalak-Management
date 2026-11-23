create extension if not exists postgis;
create extension if not exists pg_trgm;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null unique check (email = lower(email)),
  password_hash text,
  role text not null default 'user' check (role in ('user','owner')),
  email_verified_at timestamptz,
  owner_activated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists pending_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('user','owner')),
  otp_digest text not null,
  attempts int not null default 0 check (attempts between 0 and 5),
  updated_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists pending_signups_expires_at_idx on pending_signups (expires_at);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references users(id) on delete cascade,
  owner_name text not null default '',
  shop_name text not null,
  market_name text not null,
  address text not null,
  category text not null check (category in
    ('clothing','footwear','groceries','food','electronics','home','services','other')),
  phone text not null,
  image_data bytea not null,
  image_content_type text not null check (image_content_type in ('image/jpeg','image/png','image/webp')),
  image_file_name text not null,
  image_size int not null check (image_size <= 2097152),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);