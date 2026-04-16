-- Dashboard console foundation migration.
--
-- PENTING:
-- Untuk database Supabase yang sudah punya data, JANGAN copy ulang seluruh schema.sql.
-- Jalankan migration tambahan seperti file ini agar data restoran, produk, user, dan order
-- yang sudah ada tidak tertimpa atau bentrok constraint.
--
-- File ini hanya menambahkan/melengkapi struktur yang dibutuhkan dashboard console:
-- 1. Metadata restaurant/outlet/device.
-- 2. Tracking device session agar 1 user bisa dipakai maksimal 2 tablet aktif.
-- 3. Cash shift/till untuk dashboard.
-- 4. Kolom order integration yang masih kurang di remote.
-- 5. RLS policy dasar yang tetap restaurant-scoped.
--
-- Catatan keamanan:
-- Migration ini statis dan tidak menyusun SQL dari input user, jadi tidak membuka
-- jalur SQL injection. Untuk dashboard/backend nanti, semua filter dari form user
-- harus tetap lewat Supabase query builder atau parameterized query, bukan string
-- SQL manual seperti `... where name = '${input}'`.

create extension if not exists pgcrypto;

-- Role dashboard. Jika enum sudah ada, value baru ditambahkan tanpa mengubah data lama.
do $$
begin
  if exists (select 1 from pg_type where typname = 'user_role') then
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.user_role'::regtype
        and enumlabel = 'owner'
    ) then
      alter type public.user_role add value 'owner';
    end if;

    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.user_role'::regtype
        and enumlabel = 'admin'
    ) then
      alter type public.user_role add value 'admin';
    end if;
  end if;
end $$;

alter table public.restaurants
add column if not exists slug text;

alter table public.restaurants
add column if not exists is_active boolean not null default true;

alter table public.restaurants
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_restaurants_slug_unique
on public.restaurants(slug)
where slug is not null;

create table if not exists public.outlets (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outlets
add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

alter table public.outlets
add column if not exists code text;

alter table public.outlets
add column if not exists name text;

alter table public.outlets
add column if not exists is_active boolean not null default true;

alter table public.outlets
add column if not exists created_at timestamptz not null default now();

alter table public.outlets
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_outlets_restaurant_code_unique
on public.outlets(restaurant_id, code);

create index if not exists idx_outlets_restaurant_id
on public.outlets(restaurant_id);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete set null,
  device_code text not null,
  device_name text not null,
  platform text not null default 'android',
  status text not null default 'active',
  activation_secret_hash text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.devices
add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

alter table public.devices
add column if not exists outlet_id uuid references public.outlets(id) on delete set null;

alter table public.devices
add column if not exists device_code text;

alter table public.devices
add column if not exists device_name text;

alter table public.devices
add column if not exists platform text not null default 'android';

alter table public.devices
add column if not exists status text not null default 'active';

alter table public.devices
add column if not exists activation_secret_hash text;

alter table public.devices
add column if not exists last_seen_at timestamptz;

alter table public.devices
add column if not exists created_at timestamptz not null default now();

alter table public.devices
add column if not exists updated_at timestamptz not null default now();

alter table public.devices
drop constraint if exists devices_platform_check;

alter table public.devices
add constraint devices_platform_check
check (platform::text in ('android', 'ios', 'web', 'unknown'));

alter table public.devices
drop constraint if exists devices_status_check;

alter table public.devices
add constraint devices_status_check
check (status::text in ('active', 'disabled', 'revoked'));

create unique index if not exists idx_devices_restaurant_device_code_unique
on public.devices(restaurant_id, device_code);

create index if not exists idx_devices_restaurant_id
on public.devices(restaurant_id);

create index if not exists idx_devices_outlet_id
on public.devices(outlet_id);

create table if not exists public.cash_shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  outlet_id uuid references public.outlets(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  opened_by_user_id uuid references public.users(id) on delete set null,
  closed_by_user_id uuid references public.users(id) on delete set null,
  opening_balance numeric(12,2) not null default 0,
  closing_balance numeric(12,2),
  expected_cash numeric(12,2),
  cash_difference numeric(12,2),
  status text not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cash_shifts
add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

alter table public.cash_shifts
add column if not exists outlet_id uuid references public.outlets(id) on delete set null;

alter table public.cash_shifts
add column if not exists device_id uuid references public.devices(id) on delete set null;

alter table public.cash_shifts
add column if not exists opened_by_user_id uuid references public.users(id) on delete set null;

alter table public.cash_shifts
add column if not exists closed_by_user_id uuid references public.users(id) on delete set null;

alter table public.cash_shifts
add column if not exists opening_balance numeric(12,2) not null default 0;

alter table public.cash_shifts
add column if not exists closing_balance numeric(12,2);

alter table public.cash_shifts
add column if not exists expected_cash numeric(12,2);

alter table public.cash_shifts
add column if not exists cash_difference numeric(12,2);

alter table public.cash_shifts
add column if not exists status text not null default 'open';

alter table public.cash_shifts
add column if not exists opened_at timestamptz not null default now();

alter table public.cash_shifts
add column if not exists closed_at timestamptz;

alter table public.cash_shifts
add column if not exists created_at timestamptz not null default now();

alter table public.cash_shifts
add column if not exists updated_at timestamptz not null default now();

alter table public.cash_shifts
drop constraint if exists cash_shifts_status_check;

alter table public.cash_shifts
add constraint cash_shifts_status_check
check (status::text in ('open', 'closed', 'voided'));

create index if not exists idx_cash_shifts_restaurant_id
on public.cash_shifts(restaurant_id);

create index if not exists idx_cash_shifts_outlet_id
on public.cash_shifts(outlet_id);

create index if not exists idx_cash_shifts_device_id
on public.cash_shifts(device_id);

create index if not exists idx_cash_shifts_status
on public.cash_shifts(status);

-- Tabel ini dipakai untuk aturan: satu restaurant_user boleh aktif di maksimal 2 tablet.
-- Enforcement utamanya ada di trigger di bawah dan nantinya backend tetap perlu melakukan upsert
-- session saat POS login.
create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  restaurant_user_id uuid not null references public.restaurant_users(id) on delete cascade,
  device_id uuid not null references public.devices(id) on delete cascade,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.device_sessions
drop constraint if exists device_sessions_status_check;

alter table public.device_sessions
add constraint device_sessions_status_check
check (status::text in ('active', 'revoked', 'expired'));

create unique index if not exists idx_device_sessions_active_device_unique
on public.device_sessions(device_id)
where status = 'active';

create index if not exists idx_device_sessions_restaurant_user_status
on public.device_sessions(restaurant_user_id, status);

create index if not exists idx_device_sessions_restaurant_id
on public.device_sessions(restaurant_id);

create or replace function public.enforce_max_two_active_device_sessions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_session_count integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select count(*)
  into active_session_count
  from public.device_sessions ds
  where ds.restaurant_user_id = new.restaurant_user_id
    and ds.status = 'active'
    and ds.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if active_session_count >= 2 then
    raise exception 'User ini sudah aktif di 2 tablet. Cabut salah satu sesi device dulu.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_device_sessions_max_two_active
on public.device_sessions;

create trigger trg_device_sessions_max_two_active
before insert or update of status, restaurant_user_id
on public.device_sessions
for each row
execute function public.enforce_max_two_active_device_sessions();

-- Kolom external order. Ini aman untuk database yang sudah ada karena memakai IF NOT EXISTS.
alter table public.orders
add column if not exists order_source text not null default 'pos';

alter table public.orders
add column if not exists source_app text;

alter table public.orders
add column if not exists external_order_id text;

alter table public.orders
add column if not exists external_payload jsonb not null default '{}'::jsonb;

alter table public.orders
add column if not exists order_note text;

alter table public.order_items
add column if not exists options jsonb not null default '[]'::jsonb;

alter table public.order_items
add column if not exists note text;

alter table public.orders
drop constraint if exists orders_order_source_check;

alter table public.orders
add constraint orders_order_source_check
check (order_source in ('pos', 'external'));

create index if not exists idx_orders_restaurant_source_created_at
on public.orders(restaurant_id, order_source, created_at desc);

create unique index if not exists idx_orders_restaurant_external_reference
on public.orders(restaurant_id, source_app, external_order_id)
where external_order_id is not null;

-- Default outlet untuk restoran aktif yang sedang dipakai POS.
-- Ini tidak membuat device otomatis karena device harus diaktivasi dari dashboard/backend.
insert into public.outlets (restaurant_id, code, name, is_active)
select r.id, 'MAIN', 'Main Outlet', true
from public.restaurants r
where r.code = 'bh-altakhassusi'
on conflict (restaurant_id, code) do update
set name = excluded.name,
    is_active = true,
    updated_at = now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_restaurants_updated_at') then
    create trigger trg_restaurants_updated_at
    before update on public.restaurants
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_outlets_updated_at') then
    create trigger trg_outlets_updated_at
    before update on public.outlets
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_devices_updated_at') then
    create trigger trg_devices_updated_at
    before update on public.devices
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_cash_shifts_updated_at') then
    create trigger trg_cash_shifts_updated_at
    before update on public.cash_shifts
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_device_sessions_updated_at') then
    create trigger trg_device_sessions_updated_at
    before update on public.device_sessions
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

-- Update helper function agar dashboard role owner/admin juga dianggap manager restoran.
create or replace function public.is_restaurant_supervisor(target_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_users ru
    join public.users u on u.id = ru.user_id
    where ru.restaurant_id = target_restaurant_id
      and u.auth_user_id = auth.uid()
      and ru.role::text in ('owner', 'admin', 'supervisor')
  )
$$;

grant execute on function public.is_restaurant_supervisor(uuid) to authenticated;

alter table public.outlets enable row level security;
alter table public.devices enable row level security;
alter table public.cash_shifts enable row level security;
alter table public.device_sessions enable row level security;

drop policy if exists "outlets_select_member" on public.outlets;
create policy "outlets_select_member"
on public.outlets
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

drop policy if exists "outlets_manage_supervisor" on public.outlets;
create policy "outlets_manage_supervisor"
on public.outlets
for all
to authenticated
using (public.is_restaurant_supervisor(restaurant_id))
with check (public.is_restaurant_supervisor(restaurant_id));

drop policy if exists "devices_select_member" on public.devices;
create policy "devices_select_member"
on public.devices
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

drop policy if exists "devices_manage_supervisor" on public.devices;
create policy "devices_manage_supervisor"
on public.devices
for all
to authenticated
using (public.is_restaurant_supervisor(restaurant_id))
with check (public.is_restaurant_supervisor(restaurant_id));

drop policy if exists "cash_shifts_select_member" on public.cash_shifts;
create policy "cash_shifts_select_member"
on public.cash_shifts
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

drop policy if exists "cash_shifts_manage_member" on public.cash_shifts;
create policy "cash_shifts_manage_member"
on public.cash_shifts
for all
to authenticated
using (public.is_restaurant_member(restaurant_id))
with check (public.is_restaurant_member(restaurant_id));

drop policy if exists "device_sessions_select_member" on public.device_sessions;
create policy "device_sessions_select_member"
on public.device_sessions
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

drop policy if exists "device_sessions_manage_supervisor" on public.device_sessions;
create policy "device_sessions_manage_supervisor"
on public.device_sessions
for all
to authenticated
using (public.is_restaurant_supervisor(restaurant_id))
with check (public.is_restaurant_supervisor(restaurant_id));

comment on table public.device_sessions is
'Tracks POS tablet sessions. Active sessions are limited to two tablets per restaurant_user.';

comment on table public.cash_shifts is
'Cashier till/open-shift records for POS and dashboard reporting.';

comment on table public.devices is
'Registered POS devices/tablets per restaurant and outlet.';
