-- Tighten RLS so authenticated Supabase users only see rows for restaurants
-- they belong to through public.users.auth_user_id -> public.restaurant_users.
--
-- Important:
-- 1. Backend service-role access still bypasses RLS, so Express keeps working.
-- 2. Direct Supabase access from frontend now requires a real Supabase Auth session
--    whose auth.uid() is linked to public.users.auth_user_id.

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

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_restaurant_member(target_restaurant_id uuid)
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
  )
$$;

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
      and ru.role = 'supervisor'
  )
$$;

create or replace function public.can_access_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and public.is_restaurant_member(o.restaurant_id)
  )
$$;

grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.is_restaurant_member(uuid) to authenticated;
grant execute on function public.is_restaurant_supervisor(uuid) to authenticated;
grant execute on function public.can_access_order(uuid) to authenticated;

drop policy if exists "restaurants_select_authenticated" on public.restaurants;
drop policy if exists "restaurants_select_member" on public.restaurants;
create policy "restaurants_select_member"
on public.restaurants
for select
to authenticated
using (public.is_restaurant_member(id));

drop policy if exists "users_select_authenticated" on public.users;
drop policy if exists "users_select_self" on public.users;
create policy "users_select_self"
on public.users
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (auth.uid() = auth_user_id);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
on public.users
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "restaurant_users_select_authenticated" on public.restaurant_users;
drop policy if exists "restaurant_users_rw_authenticated" on public.restaurant_users;
drop policy if exists "restaurant_users_select_same_restaurant" on public.restaurant_users;
drop policy if exists "restaurant_users_manage_supervisor" on public.restaurant_users;
create policy "restaurant_users_select_same_restaurant"
on public.restaurant_users
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

create policy "restaurant_users_manage_supervisor"
on public.restaurant_users
for all
to authenticated
using (public.is_restaurant_supervisor(restaurant_id))
with check (public.is_restaurant_supervisor(restaurant_id));

drop policy if exists "categories_select_authenticated" on public.categories;
drop policy if exists "categories_rw_authenticated" on public.categories;
drop policy if exists "categories_select_member" on public.categories;
drop policy if exists "categories_manage_supervisor" on public.categories;
create policy "categories_select_member"
on public.categories
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

create policy "categories_manage_supervisor"
on public.categories
for all
to authenticated
using (public.is_restaurant_supervisor(restaurant_id))
with check (public.is_restaurant_supervisor(restaurant_id));

drop policy if exists "products_select_authenticated" on public.products;
drop policy if exists "products_rw_authenticated" on public.products;
drop policy if exists "products_select_member" on public.products;
drop policy if exists "products_manage_supervisor" on public.products;
create policy "products_select_member"
on public.products
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

create policy "products_manage_supervisor"
on public.products
for all
to authenticated
using (public.is_restaurant_supervisor(restaurant_id))
with check (public.is_restaurant_supervisor(restaurant_id));

drop policy if exists "orders_rw_authenticated" on public.orders;
drop policy if exists "orders_select_member" on public.orders;
drop policy if exists "orders_insert_member" on public.orders;
drop policy if exists "orders_update_member" on public.orders;
drop policy if exists "orders_delete_supervisor" on public.orders;
create policy "orders_select_member"
on public.orders
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

create policy "orders_insert_member"
on public.orders
for insert
to authenticated
with check (public.is_restaurant_member(restaurant_id));

create policy "orders_update_member"
on public.orders
for update
to authenticated
using (public.is_restaurant_member(restaurant_id))
with check (public.is_restaurant_member(restaurant_id));

create policy "orders_delete_supervisor"
on public.orders
for delete
to authenticated
using (public.is_restaurant_supervisor(restaurant_id));

drop policy if exists "order_items_rw_authenticated" on public.order_items;
drop policy if exists "order_items_select_member" on public.order_items;
drop policy if exists "order_items_insert_member" on public.order_items;
drop policy if exists "order_items_update_member" on public.order_items;
drop policy if exists "order_items_delete_member" on public.order_items;
create policy "order_items_select_member"
on public.order_items
for select
to authenticated
using (public.can_access_order(order_id));

create policy "order_items_insert_member"
on public.order_items
for insert
to authenticated
with check (public.can_access_order(order_id));

create policy "order_items_update_member"
on public.order_items
for update
to authenticated
using (public.can_access_order(order_id))
with check (public.can_access_order(order_id));

create policy "order_items_delete_member"
on public.order_items
for delete
to authenticated
using (public.can_access_order(order_id));

drop policy if exists "payments_rw_authenticated" on public.payments;
drop policy if exists "payments_select_member" on public.payments;
drop policy if exists "payments_insert_member" on public.payments;
drop policy if exists "payments_update_member" on public.payments;
drop policy if exists "payments_delete_member" on public.payments;
create policy "payments_select_member"
on public.payments
for select
to authenticated
using (public.can_access_order(order_id));

create policy "payments_insert_member"
on public.payments
for insert
to authenticated
with check (public.can_access_order(order_id));

create policy "payments_update_member"
on public.payments
for update
to authenticated
using (public.can_access_order(order_id))
with check (public.can_access_order(order_id));

create policy "payments_delete_member"
on public.payments
for delete
to authenticated
using (public.can_access_order(order_id));

drop policy if exists "audit_logs_select_authenticated" on public.audit_logs;
drop policy if exists "audit_logs_rw_authenticated" on public.audit_logs;
drop policy if exists "audit_logs_select_member" on public.audit_logs;
drop policy if exists "audit_logs_manage_supervisor" on public.audit_logs;
create policy "audit_logs_select_member"
on public.audit_logs
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

create policy "audit_logs_manage_supervisor"
on public.audit_logs
for all
to authenticated
using (public.is_restaurant_supervisor(restaurant_id))
with check (public.is_restaurant_supervisor(restaurant_id));

drop policy if exists "customer_contacts_select_authenticated" on public.customer_contacts;
drop policy if exists "customer_contacts_rw_authenticated" on public.customer_contacts;
drop policy if exists "customer_contacts_select_member" on public.customer_contacts;
drop policy if exists "customer_contacts_manage_member" on public.customer_contacts;
create policy "customer_contacts_select_member"
on public.customer_contacts
for select
to authenticated
using (public.is_restaurant_member(restaurant_id));

create policy "customer_contacts_manage_member"
on public.customer_contacts
for all
to authenticated
using (public.is_restaurant_member(restaurant_id))
with check (public.is_restaurant_member(restaurant_id));
