# Cookify fixes — how to apply

These are the 7 files that changed. Drop them into your project at the
same relative paths (overwriting the existing `src/App.jsx`,
`src/pages/Profile.jsx`, `src/pages/ERestaurant.jsx`,
`src/components/RecipeCard.jsx`; the other 3 are new files).

## 1. Run the SQL migration first
Open your Supabase project → SQL editor → paste the contents of
`supabase/migrations/20260802_profiles_username.sql` → Run.
This adds a `username` column to `profiles` with a case-insensitive
UNIQUE index, so the database itself refuses two people the same
username (not just the app).

## 2. Copy the code files in, then
```
npm install
npm run dev     # sanity check locally
npm run build   # confirm it builds before deploying
```

## What each file does

- **src/utils/userStorage.js** (new) — namespaces localStorage keys by
  signed-in user ID. This is the actual fix for "logging out and back in
  with a different Google account shows the same profile" — that data
  was previously saved under plain keys shared by the whole browser.
- **src/utils/username.js** (new) — slugifies a Google display name into
  a username and finds the next free one (`ade_ola`, `ade_ola_2`, ...)
  by checking the `profiles` table.
- **src/App.jsx** — favorites/XP/streak/cooked-list now load and save
  per account instead of one shared browser-wide state; Pro/Pro+ status
  resets instead of carrying over to a new account.
- **src/pages/Profile.jsx** — username/photo/accent color are now
  per-account; on first login it auto-generates and reserves a unique
  username from the person's Google name; editing a username checks
  availability against Supabase before saving.
- **src/pages/ERestaurant.jsx** — food listings now show the seller's
  username instead of their email address.
- **src/components/RecipeCard.jsx** — adds a "Watch on YouTube" link
  under every dish's prep steps (opens a YouTube search for that dish +
  "recipe how to cook"). This uses a search link, not a specific curated
  video, since no YouTube Data API key is configured — say the word if
  you'd like an embedded player instead, that just needs an API key.

## Verification note
I syntax-checked every file with the Babel parser and confirmed every
import resolves, but couldn't run a full `vite build` in my sandbox —
the project's node_modules only has a Windows-only native binding for
its bundler (rolldown), and I have no network access to fetch the Linux
one. That's specific to my sandbox, not your project — Vercel/your own
machine will install the right one automatically. Please run
`npm run build` once after applying these before you deploy, just to be safe.
