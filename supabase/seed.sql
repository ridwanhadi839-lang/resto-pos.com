insert into public.restaurants (id, code, name)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'resto-a', 'Resto A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'resto-b', 'Resto B')
on conflict (id) do update
set code = excluded.code,
    name = excluded.name;

insert into public.categories (id, restaurant_id, name)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Burger'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Appetizer'),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Soft Drink'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Rice Bowl'),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tea')
on conflict (id) do update
set restaurant_id = excluded.restaurant_id,
    name = excluded.name;

insert into public.products (id, restaurant_id, name, price, image_url, category_id)
values
  ('aaaa1111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Smoky Beef', 35000, null, '11111111-1111-1111-1111-111111111111'),
  ('aaaa2222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cheese Fries', 22000, null, '22222222-2222-2222-2222-222222222222'),
  ('aaaa3333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Coca Cola', 12000, null, '33333333-3333-3333-3333-333333333333'),
  ('bbbb1111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Chicken Teriyaki Bowl', 38000, null, '44444444-4444-4444-4444-444444444444'),
  ('bbbb2222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Lemon Tea', 10000, null, '55555555-5555-5555-5555-555555555555')
on conflict (id) do update
set restaurant_id = excluded.restaurant_id,
    name = excluded.name,
    price = excluded.price,
    image_url = excluded.image_url,
    category_id = excluded.category_id;
