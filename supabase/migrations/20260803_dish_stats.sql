-- Shared, cross-user view counter for dishes. Powers the live view count
-- on home-feed cards and the "Top Dishes" ranking on the Learn tab.
-- Safe to run even if this table already exists.

create table if not exists public.dish_stats (
  dish_name text primary key,
  image text,
  view_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.dish_stats enable row level security;

-- Everyone (including guests) can see view counts — they're public info,
-- shown right on the feed.
drop policy if exists "dish_stats are publicly readable" on public.dish_stats;
create policy "dish_stats are publicly readable"
  on public.dish_stats for select
  to anon, authenticated
  using (true);

-- Everyone (including guests) can increment a view count — there's no
-- personal data here, just a counter per dish name.
drop policy if exists "anyone can record a dish view" on public.dish_stats;
create policy "anyone can record a dish view"
  on public.dish_stats for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anyone can update a dish view count" on public.dish_stats;
create policy "anyone can update a dish view count"
  on public.dish_stats for update
  to anon, authenticated
  using (true)
  with check (true);
