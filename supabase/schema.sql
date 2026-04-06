create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('cashier', 'supervisor', 'kitchen');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('pending', 'paid', 'sent_to_kitchen');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('cash', 'qr', 'visa');
  end if;
end $$;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]+$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurant_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.user_role not null default 'cashier',
  pin_hash text not null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  unique (restaurant_id, name)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  category_id uuid not null references public.categories(id) on delete restrict
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_number text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total numeric(12,2) not null check (total >= 0),
  status public.order_status not null default 'pending',
  order_type text not null check (order_type in ('dine-in', 'takeaway', 'delivery')),
  customer_name text,
  customer_phone text,
  receipt_no text,
  split_bill_count integer not null default 1 check (split_bill_count > 0),
  table_number text,
  cashier_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (restaurant_id, order_number)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null check (qty > 0),
  price numeric(12,2) not null check (price >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method public.payment_method not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  restaurant_user_id uuid references public.restaurant_users(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  entity_type text not null check (entity_type in ('order', 'cart')),
  action text not null check (
    action in (
      'order_discount_applied',
      'order_status_changed',
      'order_voided'
    )
  ),
  order_id uuid references public.orders(id) on delete set null,
  order_number text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_restaurant_users_restaurant_id on public.restaurant_users(restaurant_id);
create index if not exists idx_restaurant_users_user_id on public.restaurant_users(user_id);
create index if not exists idx_categories_restaurant_id on public.categories(restaurant_id);
create index if not exists idx_products_restaurant_id on public.products(restaurant_id);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_orders_restaurant_id on public.orders(restaurant_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_audit_logs_restaurant_id on public.audit_logs(restaurant_id);
create index if not exists idx_audit_logs_order_id on public.audit_logs(order_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_customer_contacts_restaurant_id on public.customer_contacts(restaurant_id);
create index if not exists idx_customer_contacts_updated_at on public.customer_contacts(updated_at desc);

alter table public.restaurants enable row level security;
alter table public.users enable row level security;
alter table public.restaurant_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.customer_contacts enable row level security;

drop policy if exists "restaurants_select_authenticated" on public.restaurants;
create policy "restaurants_select_authenticated"
on public.restaurants
for select
to authenticated
using (true);

drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated"
on public.users
for select
to authenticated
using (true);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (auth.uid() = auth_user_id);

drop policy if exists "restaurant_users_select_authenticated" on public.restaurant_users;
create policy "restaurant_users_select_authenticated"
on public.restaurant_users
for select
to authenticated
using (true);

drop policy if exists "restaurant_users_rw_authenticated" on public.restaurant_users;
create policy "restaurant_users_rw_authenticated"
on public.restaurant_users
for all
to authenticated
using (true)
with check (true);

drop policy if exists "categories_select_authenticated" on public.categories;
create policy "categories_select_authenticated"
on public.categories
for select
to authenticated
using (true);

drop policy if exists "categories_rw_authenticated" on public.categories;
create policy "categories_rw_authenticated"
on public.categories
for all
to authenticated
using (true)
with check (true);

drop policy if exists "products_select_authenticated" on public.products;
create policy "products_select_authenticated"
on public.products
for select
to authenticated
using (true);

drop policy if exists "products_rw_authenticated" on public.products;
create policy "products_rw_authenticated"
on public.products
for all
to authenticated
using (true)
with check (true);

drop policy if exists "orders_rw_authenticated" on public.orders;
create policy "orders_rw_authenticated"
on public.orders
for all
to authenticated
using (true)
with check (true);

drop policy if exists "order_items_rw_authenticated" on public.order_items;
create policy "order_items_rw_authenticated"
on public.order_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "payments_rw_authenticated" on public.payments;
create policy "payments_rw_authenticated"
on public.payments
for all
to authenticated
using (true)
with check (true);

drop policy if exists "audit_logs_select_authenticated" on public.audit_logs;
create policy "audit_logs_select_authenticated"
on public.audit_logs
for select
to authenticated
using (true);

drop policy if exists "audit_logs_rw_authenticated" on public.audit_logs;
create policy "audit_logs_rw_authenticated"
on public.audit_logs
for all
to authenticated
using (true)
with check (true);

drop policy if exists "customer_contacts_select_authenticated" on public.customer_contacts;
create policy "customer_contacts_select_authenticated"
on public.customer_contacts
for select
to authenticated
using (true);

drop policy if exists "customer_contacts_rw_authenticated" on public.customer_contacts;
create policy "customer_contacts_rw_authenticated"
on public.customer_contacts
for all
to authenticated
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
