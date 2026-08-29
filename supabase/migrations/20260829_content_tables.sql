-- Comments, likes, and food_listings didn't have migrations anywhere in
-- this project yet — every place that reads/writes them already has a
-- "table not set up yet" fallback, which is how they've been quietly
-- not working. This creates all three, plus the moderation columns
-- needed for auto-flagging.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  provider text,
  text text not null,
  flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now()
);
create index if not exists comments_recipe_id_idx on public.comments (recipe_id);

alter table public.comments enable row level security;

drop policy if exists "comments are publicly readable" on public.comments;
create policy "comments are publicly readable"
  on public.comments for select
  to anon, authenticated
  using (true);

drop policy if exists "authenticated users can post comments" on public.comments;
create policy "authenticated users can post comments"
  on public.comments for insert
  to authenticated
  with check (true);

create table if not exists public.likes (
  recipe_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

alter table public.likes enable row level security;

drop policy if exists "likes are publicly readable" on public.likes;
create policy "likes are publicly readable"
  on public.likes for select
  to anon, authenticated
  using (true);

drop policy if exists "users manage their own likes" on public.likes;
create policy "users manage their own likes"
  on public.likes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.food_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_name text,
  title text not null,
  price numeric not null,
  description text,
  image text,
  flagged boolean not null default false,
  flag_reason text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);
-- Used by the new "Where to Buy" feature to find sellers of a given dish.
create index if not exists food_listings_title_idx on public.food_listings using gin (to_tsvector('english', title));

alter table public.food_listings enable row level security;

drop policy if exists "visible listings are publicly readable" on public.food_listings;
create policy "visible listings are publicly readable"
  on public.food_listings for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists "sellers can read their own listings" on public.food_listings;
create policy "sellers can read their own listings"
  on public.food_listings for select
  to authenticated
  using (auth.uid() = seller_id);

drop policy if exists "sellers can post their own listings" on public.food_listings;
create policy "sellers can post their own listings"
  on public.food_listings for insert
  to authenticated
  with check (auth.uid() = seller_id);

drop policy if exists "sellers can update their own listings" on public.food_listings;
create policy "sellers can update their own listings"
  on public.food_listings for update
  to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);
