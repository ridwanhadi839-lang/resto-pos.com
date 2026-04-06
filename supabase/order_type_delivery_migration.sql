-- Allow delivery order type for existing databases.
-- Run this in Supabase SQL Editor if your orders table already exists.

alter table public.orders
drop constraint if exists orders_order_type_check;

alter table public.orders
add constraint orders_order_type_check
check (order_type in ('dine-in', 'takeaway', 'delivery'));
