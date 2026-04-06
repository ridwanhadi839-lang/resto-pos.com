do $$
begin
  alter type public.payment_method add value if not exists 'visa';
exception
  when duplicate_object then null;
end $$;
