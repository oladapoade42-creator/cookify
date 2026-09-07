-- food_listings currently stores a single image as a base64 data URL
-- directly in a text column. That's workable for one small photo, but
-- completely impractical for video (multi-MB values bloating the
-- database) and for multiple files per listing. This adds proper file
-- storage instead.

alter table public.food_listings
  add column if not exists media jsonb not null default '[]';
-- media shape: [{ "url": "...", "type": "image" | "video" }, ...]
-- The old `image` column is left in place (untouched) so existing rows
-- and any code still reading it keep working — new listings populate
-- `media` instead.

insert into storage.buckets (id, name, public)
values ('food-listings', 'food-listings', true)
on conflict (id) do nothing;

-- Anyone can view listing media (it's public-facing content on public
-- listings) — no login required to just look at food photos/videos.
drop policy if exists "food listing media is publicly readable" on storage.objects;
create policy "food listing media is publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'food-listings');

-- Only a signed-in user can upload, and only into their own folder
-- (path must start with their user id) — prevents one user overwriting
-- or filling up another's storage folder.
drop policy if exists "users can upload their own listing media" on storage.objects;
create policy "users can upload their own listing media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'food-listings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete their own listing media" on storage.objects;
create policy "users can delete their own listing media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'food-listings' and (storage.foldername(name))[1] = auth.uid()::text);
