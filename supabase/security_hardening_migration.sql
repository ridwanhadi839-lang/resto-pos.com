-- Harden stored PIN data and remove plaintext PINs.
-- Run this after the multi-restaurant schema exists.

create extension if not exists pgcrypto;

alter table public.restaurant_users
add column if not exists pin_hash text;

update public.restaurant_users
set pin_hash = crypt(pin_code, gen_salt('bf'))
where pin_hash is null
  and pin_code is not null;

alter table public.restaurant_users
drop constraint if exists restaurant_users_restaurant_id_pin_code_key;

alter table public.restaurant_users
drop constraint if exists restaurant_users_pin_code_format;

alter table public.restaurant_users
alter column pin_code drop not null;

update public.restaurant_users
set pin_code = null
where pin_hash is not null;

do $$
begin
  if exists (
    select 1
    from public.restaurant_users
    where pin_hash is null
  ) then
    raise exception 'Masih ada row restaurant_users tanpa pin_hash. Isi dulu sebelum melanjutkan.';
  end if;
end $$;

alter table public.restaurant_users
alter column pin_hash set not null;
