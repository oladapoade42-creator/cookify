# Cookify — Google sign-in returning to the website instead of the app

3 files: `src/App.jsx`, `android/app/src/main/AndroidManifest.xml`
(overwrite), `package.json` (adds one new dependency).

## What was happening
Your sign-in code never told Supabase where to send people back to
after Google auth finished — so it fell back to your project's
configured "Site URL," which is your live Vercel site. That's correct
behavior *on the website*, but inside the native Android app it meant
finishing sign-in kicked you out of the app and into the browser
showing the website instead.

## The fix
1. On native, sign-in now redirects to a custom URL
   (`io.cookify.app://auth-callback`) instead of the website.
2. Added an intent-filter to `AndroidManifest.xml` so Android hands that
   URL back to Cookify itself instead of trying to open it as a normal
   link.
3. Added a listener (`src/App.jsx`, using the new `@capacitor/app`
   package) that catches that URL when it arrives and manually
   completes the sign-in — this doesn't happen automatically for a deep
   link the way it does for a normal page reload.

## Setup steps — three, and all are required
**1. Install the new dependency:**
```
npm install
npx cap sync android
```

**2. Add the redirect URL to Supabase's allow-list** (this is the step
most likely to bite if skipped — Supabase will silently refuse to
redirect anywhere not on this list):
Supabase Dashboard → Authentication → URL Configuration → **Redirect
URLs** → add:
```
io.cookify.app://auth-callback
```

**3. Rebuild the Android app** in Android Studio (Build → Rebuild
Project) so the updated manifest actually takes effect — a hot-reload
of just the web bundle won't pick up native manifest changes.

## After that
Test signing in from the native app — it should now land you back
inside Cookify itself immediately after choosing a Google account,
instead of opening the website. The web version (Vercel) is unaffected
either way — this only changes behavior when `Capacitor.isNativePlatform()`
is true.
