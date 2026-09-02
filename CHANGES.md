# Cookify — comments now show your actual username

1 file changed: src/components/RecipeCard.jsx
Plus one column to add via SQL Editor first.

## Run this first
```sql
alter table public.comments add column if not exists username text;
notify pgrst, 'reload schema';
```

## What was wrong
Comments were only ever storing/displaying the sign-in provider
("google"/"apple"/"guest") — there was never a username field on
comments at all, so "GOOGLE" showing up was the intended (if not very
useful) original behavior, not a bug from the recent fixes.

## What changed
Comments now store your actual Cookify username at post time (the same
one shown on your Profile page), and display that instead — falling
back to the provider label only for guest comments or older comments
posted before this change (so nothing old breaks or shows blank).
