# Cookify fixes, round 2 — how to apply

7 files: 6 changed (overwrite at the same path) + 1 new SQL migration.

## 1. Run the SQL migration first
Supabase SQL editor → paste `supabase/migrations/20260803_dish_stats.sql` → Run.
Creates the shared `dish_stats` table (with RLS letting anyone read/increment
counts — no personal data in it, just dish name + count) that the live view
counter writes to.

## 2. Copy the code files in, then `npm install && npm run build`

## What changed

- **src/index.css** — light mode fix. The old CSS enumerated exact classes
  (`bg-black/70`, `bg-slate-900/95`, ...), but Tailwind treats every opacity
  variant as its own class, so anything not explicitly listed (the sticky
  feed header `bg-black/95`, stat tiles `bg-black/60`, a few card headers)
  silently stayed dark in light mode. Rewrote it with prefix-matching
  selectors that catch every current *and future* opacity variant
  automatically, without also breaking `hover:`/`focus:` variants (a real
  risk with naive wildcards — I checked for and excluded that case).

- **src/pages/Home.jsx** — three separate things:
  1. The AI Tutor modal (opens from Quick Actions, same area as Scan Food)
     was capped at `700px` wide while every other modal in the app matches
     the ~430px phone-frame width — fixed to match.
  2. Live view counter: the wiring (IntersectionObserver, a shared
     `dish_stats` Supabase table) already existed, but the function that
     writes to it looked up `meal.name`, while home-feed dishes only have
     `.title` — every feed-card view was silently failing to save. Fixed
     the key mismatch, and now the feed also pulls real cross-user counts
     from Supabase on load instead of only counting this one browser's own
     view history (which is why it looked "stuck at zero" for anyone
     testing solo).
  3. Diet Plan results now have a "Download as PDF" button.

- **src/components/RecipeCard.jsx** — lowered the scroll-into-view
  threshold from 60% to 40% so a view registers a bit more readily while
  scrolling. (No other changes here this round — the file already used
  the `CirclePlay` icon from the last patch.)

- **src/pages/Settings.jsx** — new "Phone Verification" section: enter a
  number, get a code, verify it. Uses Supabase's built-in phone OTP
  (`auth.updateUser({ phone })` + `auth.verifyOtp(...)`), linked to the
  already-signed-in Google account rather than creating a separate login.
  **This needs an SMS provider (Twilio, MessageBird, etc.) configured in
  your Supabase project's Auth settings — without one, "Send code" will
  fail with an error from Supabase.** That configuration has to happen in
  your dashboard; I can't do it from here.

- **src/utils/pdf.js** (new) — a small, dependency-free PDF writer (no
  jsPDF install needed) used for the diet plan download. I tested it with
  `qpdf --check` and `pdftotext` outside the sandbox's broken build tool —
  it produces a valid, paginating PDF, and I specifically fixed a bug
  where em-dashes/smart quotes from AI-generated text would have
  corrupted the file (Blob UTF-8-encodes JS strings by default; PDF
  content streams need raw single-byte text) — output is sanitized and
  written as raw bytes now.

## Camera auto-opening on Scan Food
I looked closely and couldn't find a code path that opens the camera
before the "Open camera" button is tapped — the gating logic already
looks correct. If it's still happening after you deploy these fixes,
let me know what device/browser you're seeing it on and I'll dig deeper.

## Verification note (same as last time)
Syntax-checked every file with the Babel parser, confirmed every import
resolves, and actually generated + validated sample PDFs with `qpdf` and
`pdftotext`. Still couldn't run a real `vite build` here — sandbox only
has a Windows binding for the bundler — so please run `npm run build`
once after applying, before you deploy.
