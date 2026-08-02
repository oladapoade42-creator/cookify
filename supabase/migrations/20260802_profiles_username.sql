-- Adds a unique, per-account username to the profiles table.
-- Run this in the Supabase SQL editor (or `supabase db push`) for the
-- project referenced in supabase/.temp/project-ref.
--
-- Safe to run even if `profiles` already exists — every statement below
-- is written to be idempotent.

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

alter table public.profiles
  add column if not exists username text;

-- Case-insensitive uniqueness: "Chef_Ade" and "chef_ade" are the same
-- username, so two different people can't grab lookalikes of each other.
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles enable row level security;

-- Anyone signed in can look up usernames (needed to check availability
-- and to show seller names on E-Restaurant listings).
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- A user can only ever create/update their own row.
drop policy if exists "users can upsert their own profile" on public.profiles;
create policy "users can upsert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
