# Cookify — AI Tutor fix, Where to Buy fix, Android performance, doodles

10 files: 9 changed, 1 new (`EmptyStateDoodles.jsx`) — all pure code,
no SQL/dashboard steps needed.

## 1. AI Tutor "X" not stopping speech
Not actually a broken stop button — `closeTutor()` was already calling
the right stop function. The real bug: three places in the code `await`
a Gemini response and then speak it out loud with no check on whether
the tutor was still open by the time that response arrived. Close the
tutor quickly while a reply is still in flight, and the reply would
speak anyway once it landed, seconds after you'd already left. Fixed
with a ref that always reflects the tutor's *current* open/closed
state (state values in an async callback can go stale; refs don't).

## 2. "Where to Buy" stuck loading forever
Found it: when zero sellers matched a dish (the common case for a new
app), the code returned early from inside a `try` block — skipping the
`setLoadingWhereToBuy(false)` that came after it. Moved that into a
`finally`, so every path out of the function clears the spinner, no
matter what. Also added real geolocation: it now asks for your
location and sorts results by actual distance (shows "X.Xkm away"),
degrading gracefully with unsorted results if location is denied.

## 3. Android performance
Two real, measurable culprits found and fixed:
- **Zero images anywhere used lazy loading** — every recipe image in
  every list loaded immediately regardless of visibility. Added
  `loading="lazy" decoding="async"` to every list/feed image across
  the app (left the profile photo eager, since that one really is
  always immediately visible).
- **Heavy, stacked `backdrop-blur`** — the header and bottom nav (always
  mounted, sitting directly over scrolling content) used the heaviest
  Tailwind blur tiers, recomputed every scroll frame. Worse: every
  single feed card had 5 more individually-blurred small buttons
  (menu/like/comment/share/save) — multiplied across every card
  rendered in the feed, likely the single biggest cause of the reported
  lag. Reduced header/nav blur intensity substantially, and removed
  blur entirely from the per-card buttons (compensated with slightly
  more opaque backgrounds so they're still clearly visible without it).

None of this changes how anything looks at a glance — same frosted,
dark aesthetic — it's specifically about not paying GPU cost for blur
where it added minimal visual value but got very expensive once
multiplied across a scrolling list.

## 4. A few doodles, placed where there was genuinely nothing else
Added `EmptyStateDoodles.jsx` — four small monochrome line-art SVGs
(no image assets, no new colors) — and placed them in the emptiest,
most text-only spots: empty Favorites, empty comments, empty "Where to
Buy" results, and empty "My Diet Plans." Didn't touch anywhere that
already has real content or a clear visual hierarchy — wanted this to
feel like a few thoughtful touches, not a wholesale re-skin you didn't
ask for.
