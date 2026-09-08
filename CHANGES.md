# Cookify — Google sign-in: parse the actual token format

1 file: src/App.jsx

## What the debug alert revealed
Your screenshot showed the real URL the app received:
io.cookify.app://auth-callback#access_token=...&refresh_token=...&token_type=bearer

That's tokens sitting directly in the URL fragment (after #). My
previous version was looking for a `?code=...` query parameter instead
— a completely different OAuth flow shape. It was checking for
something that was never going to be there, which is exactly why it
kept silently doing nothing useful. Good thing you sent that alert
screenshot — guessing again would've been a waste of another round.

## The fix
Now parses the actual format: pulls `access_token` and `refresh_token`
out of the URL fragment and calls `supabase.auth.setSession(...)`
directly with them, instead of the exchange-a-code approach that didn't
match what your project actually sends back.

## Test
Uninstall, clean rebuild, fresh install, try Google sign-in again. The
debug alerts are still in place — if this attempt fails for some other
reason, you'll see exactly what and where, and we can fix that specific
thing instead of guessing. If it works, let me know and I'll send one
more tiny patch to remove the debug alerts (they're diagnostic-only,
not something a real user should ever see).
