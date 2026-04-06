-- Migrate an existing single-restaurant schema to the new multi-restaurant model.
-- Run this only if your database already used the old schema.

create extension if not exists pgcrypto;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.restaurants (id, code, name)
values ('99999999-9999-9999-9999-999999999999', 'main', 'Main Restaurant')
on conflict (id) do nothing;

create table if not exists public.restaurant_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.user_role not null default 'cashier',
  pin_code text not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id),
  unique (restaurant_id, pin_code)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'restaurant_users_pin_code_format'
  ) then
    alter table public.restaurant_users
    add constraint restaurant_users_pin_code_format
    check (pin_code ~ '^[0-9]{6}$');
  end if;
end $$;

alter table public.categories add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
alter table public.products add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
alter table public.orders add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;

update public.categories
set restaurant_id = '99999999-9999-9999-9999-999999999999'
where restaurant_id is null;

update public.products
set restaurant_id = '99999999-9999-9999-9999-999999999999'
where restaurant_id is null;

update public.orders
set restaurant_id = '99999999-9999-9999-9999-999999999999'
where restaurant_id is null;

alter table public.categories alter column restaurant_id set not null;
alter table public.products alter column restaurant_id set not null;
alter table public.orders alter column restaurant_id set not null;

alter table public.categories
drop constraint if exists categories_name_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'categories_restaurant_name_unique'
  ) then
    alter table public.categories
    add constraint categories_restaurant_name_unique
    unique (restaurant_id, name);
  end if;
end $$;

alter table public.orders
drop constraint if exists orders_order_number_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_restaurant_order_number_unique'
  ) then
    alter table public.orders
    add constraint orders_restaurant_order_number_unique
    unique (restaurant_id, order_number);
  end if;
exception
  when duplicate_table then null;
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'pin_code'
  ) then
    execute $sql$
      insert into public.restaurant_users (restaurant_id, user_id, role, pin_code)
      select
        '99999999-9999-9999-9999-999999999999',
        u.id,
        'cashier'::public.user_role,
        coalesce(nullif(u.pin_code, ''), lpad((100000 + row_number() over (order by u.created_at))::text, 6, '0'))
      from public.users u
      on conflict (restaurant_id, user_id) do update
      set pin_code = excluded.pin_code
    $sql$;
  end if;
end $$;
