alter table public.comments
  add column if not exists username text,
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

update public.comments as comment
set username = profile.username
from public.profiles as profile
where comment.user_id = profile.user_id
  and (comment.username is null or comment.username = '');

create index if not exists comments_parent_id_idx on public.comments (parent_id);

drop policy if exists "authenticated users can post comments" on public.comments;
create policy "authenticated users can post comments"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own comments" on public.comments;
create policy "users can update their own comments"
  on public.comments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete their own comments" on public.comments;
create policy "users can delete their own comments"
  on public.comments for delete
  to authenticated
  using (auth.uid() = user_id);