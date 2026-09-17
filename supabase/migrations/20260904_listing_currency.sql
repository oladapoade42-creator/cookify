alter table public.food_listings
  add column if not exists currency text not null default 'USD';

notify pgrst, 'reload schema';
