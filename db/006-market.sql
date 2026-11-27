-- 006-markets.sql: market directory data model (Module 1, phase 1).
-- Additive and idempotent: safe to run on a live database and safe to re-run.
-- Hierarchy:  areas -> markets -> zones -> lanes -> stalls <- shops (via shop_stalls)
-- Requires:   schema.sql (users, shops) and 003-shop-image-storage.sql.

-- ---------------------------------------------------------------- areas
create table if not exists areas (
  id         uuid primary key default gen_random_uuid(),
  city       text not null,
  name       text not null,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  unique (city, name)
);

-- -------------------------------------------------------------- markets
-- Each market is a tenant: adding one is a data change, not a code change.
create table if not exists markets (
  id         uuid primary key default gen_random_uuid(),
  area_id    uuid not null references areas(id) on delete restrict,
  name       text not null,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status     text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists markets_area_id_idx on markets (area_id);

-- ---------------------------------------------------------------- zones
create table if not exists zones (
  id         uuid primary key default gen_random_uuid(),
  market_id  uuid not null references markets(id) on delete cascade,
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  unique (market_id, name),
  unique (id, market_id)          -- target for the composite foreign key on lanes
);

-- ---------------------------------------------------------------- lanes
create table if not exists lanes (
  id         uuid primary key default gen_random_uuid(),
  market_id  uuid not null references markets(id) on delete cascade,
  zone_id    uuid,                -- optional: a small market may have no zones
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  unique (market_id, name),
  unique (id, market_id),         -- target for the composite foreign key on stalls
  -- A lane can only point at a zone of the SAME market (the database enforces it):
  foreign key (zone_id, market_id) references zones (id, market_id)
);
create index if not exists lanes_zone_id_idx on lanes (zone_id);

-- --------------------------------------------------------------- stalls
-- A stall's zone is reached through its lane, so it is stored in one place only.
create table if not exists stalls (
  id         uuid primary key default gen_random_uuid(),
  market_id  uuid not null references markets(id) on delete cascade,
  lane_id    uuid not null,
  stall_no   text not null check (length(trim(stall_no)) > 0),
  side       text check (side in ('left', 'right')),
  created_at timestamptz not null default now(),
  unique (market_id, lane_id, stall_no),
  unique (id, market_id),         -- target for the composite foreign key on shop_stalls
  foreign key (lane_id, market_id) references lanes (id, market_id)
);
create index if not exists stalls_lane_id_idx on stalls (lane_id);

-- ----------------------------------------------------------- categories
-- A shared tree, managed by admins. It replaces the hard-coded CHECK list on shops.category.
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references categories(id) on delete restrict,
  name       text not null,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index if not exists categories_parent_id_idx on categories (parent_id);

-- The eight categories that already exist on shops.category, so the migration below can map them.
insert into categories (slug, name, sort_order) values
  ('clothing',    'Clothing',    1),
  ('footwear',    'Footwear',    2),
  ('groceries',   'Groceries',   3),
  ('food',        'Food',        4),
  ('electronics', 'Electronics', 5),
  ('home',        'Home',        6),
  ('services',    'Services',    7),
  ('other',       'Other',       8)
on conflict (slug) do nothing;

-- ---------------------------------------------------- shops: new columns
alter table shops add column if not exists market_id uuid references markets(id) on delete restrict;
alter table shops add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shops_status_check') then
    alter table shops add constraint shops_status_check check (status in ('pending', 'verified', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shops_id_market_id_key') then
    alter table shops add constraint shops_id_market_id_key unique (id, market_id);  -- target for shop_stalls
  end if;
end $$;

-- Legacy free-text fields stay for now but are no longer required (dropped in a later migration).
alter table shops alter column market_name drop not null;
alter table shops alter column category drop not null;

create index if not exists shops_market_status_idx on shops (market_id, status);
create index if not exists shops_name_trgm_idx on shops using gin (shop_name gin_trgm_ops);

-- ------------------------------------------------------- shop_categories
create table if not exists shop_categories (
  shop_id     uuid not null references shops(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  primary key (shop_id, category_id)
);
create index if not exists shop_categories_category_id_idx on shop_categories (category_id);

insert into shop_categories (shop_id, category_id)
select s.id, c.id
from shops s
join categories c on c.slug = s.category
on conflict do nothing;

-- ------------------------------------------------------------ shop_stalls
-- unique (stall_id): a stall holds at most one shop. A shop may hold several stalls.
-- The composite foreign keys force shop, stall and this row to belong to one market.
create table if not exists shop_stalls (
  shop_id    uuid not null,
  stall_id   uuid not null,
  market_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (shop_id, stall_id),
  unique (stall_id),
  foreign key (shop_id, market_id)  references shops  (id, market_id) on delete cascade,
  foreign key (stall_id, market_id) references stalls (id, market_id) on delete restrict
);

-- ------------------------------------------------------------------ RLS
-- Only the server (DATABASE_URL) touches these tables. Keep them off Supabase's public API.
alter table areas           enable row level security;
alter table markets         enable row level security;
alter table zones           enable row level security;
alter table lanes           enable row level security;
alter table stalls          enable row level security;
alter table categories      enable row level security;
alter table shop_categories enable row level security;
alter table shop_stalls     enable row level security;