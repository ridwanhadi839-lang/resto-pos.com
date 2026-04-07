

insert into public.users (auth_user_id, name)
values (
  'ISI_AUTH_USER_ID_DI_SINI', 
  'Nama User Di Sini'         
)
on conflict (auth_user_id) do update
set name = excluded.name;

insert into public.restaurant_users (restaurant_id, user_id, role, pin_hash)
select
  r.id,
  u.id,
  'cashier'::public.user_role,
  crypt('123456', gen_salt('bf')) 
from public.restaurants r
join public.users u
  on u.auth_user_id = 'ISI_AUTH_USER_ID_DI_SINI' 
where r.code = 'resto-a'                     
on conflict (restaurant_id, user_id) do update
set role = excluded.role,
    pin_hash = excluded.pin_hash;


insert into public.restaurant_users (restaurant_id, user_id, role, pin_hash)
select
  r.id,
  u.id,
  'cashier'::public.user_role, 
  crypt('654321', gen_salt('bf')) 
from public.restaurants r
join public.users u
  on u.auth_user_id = 'ISI_AUTH_USER_ID_DI_SINI' 
where r.code = 'resto-b'                        
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
where u.auth_user_id = 'ISI_AUTH_USER_ID_DI_SINI' 
order by r.code;
