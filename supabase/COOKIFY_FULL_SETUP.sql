-- ============================================================
-- COOKIFY — FULL DATABASE SETUP (consolidated, idempotent)
-- ============================================================
-- Safe to run this whole file top to bottom, any number of times,
-- regardless of what state your Supabase project is currently in —
-- every statement either creates something only if it's missing, or
-- replaces a policy that may already exist. Nothing here will error
-- out or duplicate data on a second run.
--
-- Run this entire file in Supabase → SQL Editor → New query → paste
-- all of it → Run.

-- ---------------------------------------------------------------
-- 1. PROFILES (username, seller payment details, accent color)
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  accent_color text,
  seller_bank_name text,
  seller_account_name text,
  seller_account_number text,
  seller_address text,
  delivery_radius_km numeric,
  seller_lat double precision,
  seller_lng double precision,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles enable row level security;

drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users can upsert their own profile" on public.profiles;
create policy "users can upsert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 2. DISH_STATS (shared, cross-user "views" counter on the feed)
-- ---------------------------------------------------------------
create table if not exists public.dish_stats (
  dish_name text primary key,
  image text,
  view_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.dish_stats enable row level security;

drop policy if exists "dish_stats are publicly readable" on public.dish_stats;
create policy "dish_stats are publicly readable"
  on public.dish_stats for select to anon, authenticated using (true);

drop policy if exists "anyone can record a dish view" on public.dish_stats;
create policy "anyone can record a dish view"
  on public.dish_stats for insert to anon, authenticated with check (true);

drop policy if exists "anyone can update a dish view count" on public.dish_stats;
create policy "anyone can update a dish view count"
  on public.dish_stats for update to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------
-- 3. SUBSCRIPTIONS (Cookify Pro / Pro+ status)
-- ---------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive',
  tier text,
  flw_customer_email text,
  flw_tx_ref text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_flw_customer_email_idx
  on public.subscriptions (flw_customer_email);

alter table public.subscriptions enable row level security;

drop policy if exists "users can read their own subscription" on public.subscriptions;
create policy "users can read their own subscription"
  on public.subscriptions for select to authenticated using (auth.uid() = user_id);
-- No insert/update policy on purpose — only the Edge Functions (using
-- the service-role key, which bypasses RLS) are allowed to grant or
-- change subscription status. A user should never write to this table
-- directly from the app.

-- ---------------------------------------------------------------
-- 4. COMMENTS
-- ---------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  provider text,
  username text,
  text text not null default '',
  flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now()
);
create index if not exists comments_recipe_id_idx on public.comments (recipe_id);

-- In case the table already existed from an earlier partial setup
-- without these columns:
alter table public.comments add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.comments add column if not exists username text;
alter table public.comments add column if not exists text text not null default '';
alter table public.comments add column if not exists flagged boolean not null default false;
alter table public.comments add column if not exists flag_reason text;

alter table public.comments enable row level security;

drop policy if exists "comments are publicly readable" on public.comments;
create policy "comments are publicly readable"
  on public.comments for select to anon, authenticated using (true);

drop policy if exists "authenticated users can post comments" on public.comments;
create policy "authenticated users can post comments"
  on public.comments for insert to authenticated with check (true);

-- ---------------------------------------------------------------
-- 5. LIKES
-- ---------------------------------------------------------------
create table if not exists public.likes (
  recipe_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

alter table public.likes enable row level security;

drop policy if exists "likes are publicly readable" on public.likes;
create policy "likes are publicly readable"
  on public.likes for select to anon, authenticated using (true);

drop policy if exists "users manage their own likes" on public.likes;
create policy "users manage their own likes"
  on public.likes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 6. FOOD_LISTINGS (E-Restaurant)
-- ---------------------------------------------------------------
create table if not exists public.food_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_name text,
  title text not null,
  price numeric not null,
  currency text not null default 'USD',
  description text,
  image text,
  media jsonb not null default '[]',
  flagged boolean not null default false,
  flag_reason text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- In case the table already existed from an earlier partial setup:
alter table public.food_listings add column if not exists currency text not null default 'USD';
alter table public.food_listings add column if not exists media jsonb not null default '[]';
alter table public.food_listings add column if not exists flagged boolean not null default false;
alter table public.food_listings add column if not exists flag_reason text;
alter table public.food_listings add column if not exists is_visible boolean not null default true;

create index if not exists food_listings_title_idx on public.food_listings using gin (to_tsvector('english', title));

alter table public.food_listings enable row level security;

drop policy if exists "visible listings are publicly readable" on public.food_listings;
create policy "visible listings are publicly readable"
  on public.food_listings for select to anon, authenticated using (is_visible = true);

drop policy if exists "sellers can read their own listings" on public.food_listings;
create policy "sellers can read their own listings"
  on public.food_listings for select to authenticated using (auth.uid() = seller_id);

drop policy if exists "sellers can post their own listings" on public.food_listings;
create policy "sellers can post their own listings"
  on public.food_listings for insert to authenticated with check (auth.uid() = seller_id);

drop policy if exists "sellers can update their own listings" on public.food_listings;
create policy "sellers can update their own listings"
  on public.food_listings for update to authenticated
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- ---------------------------------------------------------------
-- 7. ORDERS (E-Restaurant buyer/seller order tracking + disputes)
-- ---------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.food_listings(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  buyer_confirmed boolean not null default false,
  disputed boolean not null default false,
  dispute_reason text,
  created_at timestamptz not null default now()
);

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_seller_id_idx on public.orders (seller_id);

alter table public.orders enable row level security;

drop policy if exists "buyers and sellers can read their own orders" on public.orders;
create policy "buyers and sellers can read their own orders"
  on public.orders for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "buyers can place orders" on public.orders;
create policy "buyers can place orders"
  on public.orders for insert to authenticated with check (auth.uid() = buyer_id);

drop policy if exists "buyers and sellers can update their own orders" on public.orders;
create policy "buyers and sellers can update their own orders"
  on public.orders for update to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ---------------------------------------------------------------
-- 8. STORAGE BUCKET (food listing photos/videos)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('food-listings', 'food-listings', true)
on conflict (id) do nothing;

drop policy if exists "food listing media is publicly readable" on storage.objects;
create policy "food listing media is publicly readable"
  on storage.objects for select to public using (bucket_id = 'food-listings');

drop policy if exists "users can upload their own listing media" on storage.objects;
create policy "users can upload their own listing media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'food-listings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete their own listing media" on storage.objects;
create policy "users can delete their own listing media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'food-listings' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------
-- Done — force PostgREST to pick up every change above immediately,
-- instead of waiting for its own cache to refresh on its own schedule.
-- ---------------------------------------------------------------
notify pgrst, 'reload schema';
