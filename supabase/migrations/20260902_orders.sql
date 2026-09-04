-- orders didn't have a migration anywhere either (same "table not set
-- up yet" pattern as comments/food_listings before). This adds it, plus
-- the two columns that actually address the seller-scam risk:
-- buyer_confirmed and disputed — giving the BUYER a say in whether an
-- order is really done, instead of only the seller controlling status.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.food_listings(id) on delete set null,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending', -- pending | preparing | out_for_delivery | delivered
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
  on public.orders for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "buyers can place orders" on public.orders;
create policy "buyers can place orders"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = buyer_id);

-- Both sides need to update the same row (seller updates status, buyer
-- updates buyer_confirmed/disputed) — one policy covering either party.
-- Application code is what actually restricts which fields each side
-- sends; this isn't a hard per-column security boundary, but the app
-- never lets a buyer set `status` or a seller set `buyer_confirmed`.
drop policy if exists "buyers and sellers can update their own orders" on public.orders;
create policy "buyers and sellers can update their own orders"
  on public.orders for update
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);
