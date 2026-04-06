create extension if not exists pgcrypto;

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_contacts_restaurant_id
  on public.customer_contacts(restaurant_id);

create index if not exists idx_customer_contacts_updated_at
  on public.customer_contacts(updated_at desc);

alter table public.customer_contacts enable row level security;

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
