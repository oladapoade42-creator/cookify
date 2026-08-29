-- The `subscriptions` table that both verify-payment and
-- flutterwave-webhook write to. This was missing from the project
-- entirely — without it, every "successful" payment's database write
-- silently fails (see the fix in verify-payment/index.ts that now
-- actually checks for this instead of ignoring it), meaning a real,
-- charged customer would never actually get Cookify Pro.
--
-- Run this in the Supabase SQL editor before accepting any real payments.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'inactive', -- 'active' | 'inactive'
  tier text, -- 'pro' | 'pro_plus'
  flw_customer_email text,
  flw_tx_ref text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- The webhook looks subscriptions up by email (Flutterwave's payload
-- doesn't include your internal user_id), so this needs to be fast.
create index if not exists subscriptions_flw_customer_email_idx
  on public.subscriptions (flw_customer_email);

alter table public.subscriptions enable row level security;

-- A user can read their own subscription row (this is what the app
-- checks on load to decide whether to show Pro features) — nothing more.
drop policy if exists "users can read their own subscription" on public.subscriptions;
create policy "users can read their own subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies for regular users on purpose: only
-- the Edge Functions (using the service-role key, which bypasses RLS
-- entirely) are allowed to grant or revoke Pro status. A user should
-- never be able to write to this table directly from the app.
