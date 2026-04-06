-- =========================================================
-- PIN per restoran untuk 1 user
-- Jalankan file ini di Supabase SQL Editor
-- Edit semua bagian yang diberi komentar "UBAH DI SINI"
-- =========================================================

-- Langkah bantu:
-- 1. Pastikan restoran sudah ada di public.restaurants
-- 2. Pastikan user auth sudah ada di auth.users
-- 3. Ganti placeholder di bawah ini

-- Untuk melihat auth_user_id, jalankan query ini secara terpisah:
-- select id, email from auth.users;

-- 1. Buat / update profil user app
insert into public.users (auth_user_id, name)
values (
  'ISI_AUTH_USER_ID_DI_SINI', -- UBAH DI SINI: auth_user_id dari auth.users
  'Nama User Di Sini'         -- UBAH DI SINI: nama user
)
on conflict (auth_user_id) do update
set name = excluded.name;

-- 2. Assign user ke restoran pertama dengan PIN tertentu
insert into public.restaurant_users (restaurant_id, user_id, role, pin_hash)
select
  r.id,
  u.id,
  'cashier'::public.user_role, -- UBAH DI SINI: cashier / supervisor / kitchen
  crypt('123456', gen_salt('bf')) -- UBAH DI SINI: ganti 123456 dengan PIN 6 digit untuk restoran ini
from public.restaurants r
join public.users u
  on u.auth_user_id = 'ISI_AUTH_USER_ID_DI_SINI' -- UBAH DI SINI: auth_user_id yang sama
where r.code = 'resto-a'                         -- UBAH DI SINI: kode restoran
on conflict (restaurant_id, user_id) do update
set role = excluded.role,
    pin_hash = excluded.pin_hash;

-- 3. Jika user yang sama juga punya akses ke restoran kedua,
--    copy blok insert di bawah ini lalu ubah restoran, role, dan PIN.
insert into public.restaurant_users (restaurant_id, user_id, role, pin_hash)
select
  r.id,
  u.id,
  'cashier'::public.user_role, -- UBAH DI SINI: cashier / supervisor / kitchen
  crypt('654321', gen_salt('bf')) -- UBAH DI SINI: ganti 654321 dengan PIN 6 digit untuk restoran kedua
from public.restaurants r
join public.users u
  on u.auth_user_id = 'ISI_AUTH_USER_ID_DI_SINI' -- UBAH DI SINI: auth_user_id yang sama
where r.code = 'resto-b'                         -- UBAH DI SINI: kode restoran kedua
on conflict (restaurant_id, user_id) do update
set role = excluded.role,
    pin_hash = excluded.pin_hash;

-- 4. Cek hasil akhir
select
  r.code as restaurant_code,
  r.name as restaurant_name,
  u.name as user_name,
  ru.role
from public.restaurant_users ru
join public.restaurants r on r.id = ru.restaurant_id
join public.users u on u.id = ru.user_id
where u.auth_user_id = 'ISI_AUTH_USER_ID_DI_SINI' -- UBAH DI SINI: auth_user_id yang sama
order by r.code;
