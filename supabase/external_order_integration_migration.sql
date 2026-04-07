-- External order integration support for Supabase.
-- Run this in Supabase SQL Editor if your database already exists.
--
-- Catatan perubahan:
-- 1. `orders.order_source` membedakan order dari POS internal vs aplikasi lain.
-- 2. `orders.source_app` dan `orders.external_order_id` dipakai untuk deduplikasi.
-- 3. `orders.external_payload` menyimpan payload ringkas asli untuk audit / troubleshooting.
-- 4. `orders.order_note`, `order_items.options`, dan `order_items.note` memastikan
--    kitchen print bisa mengikuti instruksi yang dikirimkan aplikasi partner.

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

comment on column public.orders.order_source is
'Sumber order: default dari POS internal, atau external jika order datang dari aplikasi partner.';

comment on column public.orders.source_app is
'Nama aplikasi / channel pengirim order, misalnya GrabFood, GoFood, ShopeeFood, atau custom webhook.';

comment on column public.orders.external_order_id is
'ID order dari sistem luar untuk deduplikasi webhook dan rekonsiliasi data.';

comment on column public.orders.external_payload is
'Payload ringkas dari aplikasi luar agar perubahan format atau kebutuhan audit masih bisa ditelusuri.';

comment on column public.orders.order_note is
'Catatan pada level order yang ikut dipakai saat kitchen ticket atau cashier receipt dicetak.';

comment on column public.order_items.options is
'Array JSON untuk modifier / opsi item. Contoh: ["Extra cheese", "Less sugar"].';

comment on column public.order_items.note is
'Catatan khusus per item yang perlu tampil di kitchen print.';
