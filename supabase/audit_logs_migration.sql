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

create index if not exists idx_audit_logs_restaurant_id on public.audit_logs(restaurant_id);
create index if not exists idx_audit_logs_order_id on public.audit_logs(order_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

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
