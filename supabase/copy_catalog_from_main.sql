-- =========================================================
-- Copy katalog dari restoran `main` ke `resto-a` dan `resto-b`
-- Aman dijalankan ulang: kategori dan produk yang sama tidak akan diduplikasi
-- Jalankan file ini di Supabase SQL Editor
-- =========================================================

-- 1. Copy kategori dari `main` ke `resto-a` dan `resto-b`
with main_restaurant as (
  select id
  from public.restaurants
  where code = 'main'
),
target_restaurants as (
  select id, code
  from public.restaurants
  where code in ('resto-a', 'resto-b')
),
main_categories as (
  select c.name
  from public.categories c
  where c.restaurant_id = (select id from main_restaurant)
)
insert into public.categories (restaurant_id, name)
select
  tr.id,
  mc.name
from target_restaurants tr
cross join main_categories mc
where not exists (
  select 1
  from public.categories existing
  where existing.restaurant_id = tr.id
    and existing.name = mc.name
);

-- 2. Copy produk dari `main` ke `resto-a` dan `resto-b`
with main_restaurant as (
  select id
  from public.restaurants
  where code = 'main'
),
target_restaurants as (
  select id, code
  from public.restaurants
  where code in ('resto-a', 'resto-b')
),
main_products as (
  select
    p.name,
    p.price,
    p.image_url,
    c.name as category_name
  from public.products p
  join public.categories c on c.id = p.category_id
  where p.restaurant_id = (select id from main_restaurant)
),
target_categories as (
  select
    c.id,
    c.restaurant_id,
    c.name
  from public.categories c
  join target_restaurants tr on tr.id = c.restaurant_id
)
insert into public.products (restaurant_id, name, price, image_url, category_id)
select
  tc.restaurant_id,
  mp.name,
  mp.price,
  mp.image_url,
  tc.id
from main_products mp
join target_categories tc
  on tc.name = mp.category_name
where not exists (
  select 1
  from public.products existing
  where existing.restaurant_id = tc.restaurant_id
    and existing.category_id = tc.id
    and existing.name = mp.name
);

-- 3. Cek hasil copy
select
  r.code as restaurant_code,
  count(distinct c.id) as category_count,
  count(distinct p.id) as product_count
from public.restaurants r
left join public.categories c on c.restaurant_id = r.id
left join public.products p on p.restaurant_id = r.id
where r.code in ('main', 'resto-a', 'resto-b')
group by r.code
order by r.code;
