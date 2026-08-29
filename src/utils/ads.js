import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

// Your AdMob interstitial ad unit (from the Cookify AdMob account — the
// App ID itself lives in android/app/src/main/AndroidManifest.xml, not
// here; this is just the ad *unit*).
const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-2000428411922517/7085620777";

// AdMob's native SDK only exists on Android/iOS through Capacitor — there
// is no ad to show when Cookify is running as a plain website (Vercel) or
// in a browser dev server. Every function here checks this first so nothing
// throws or behaves oddly outside the native app build.
const isNative = () => Capacitor.isNativePlatform();

let initialized = false;
let interstitialLoaded = false;
let loadInFlight = null;

export async function initAds() {
  if (!isNative() || initialized) return;
  try {
    await AdMob.initialize({
      // Flip to true only while testing, and add your test device ID —
      // shipping this as true would serve fake ads (and get your AdMob
      // account flagged) to real users. Left false for production.
      initializeForTesting: false,
    });
    initialized = true;
    preloadInterstitial();
  } catch (e) {
    // If init fails, every call below just silently no-ops — a broken ad
    // network should never crash or block the app.
  }
}

// Loads the next interstitial ahead of time so it's ready the instant
// someone exits a recipe, instead of them waiting on a network call in
// that moment. Safe to call repeatedly — it won't start a second load
// while one is already in flight or one is already sitting ready.
export function preloadInterstitial() {
  if (!isNative() || !initialized || interstitialLoaded || loadInFlight) return;
  loadInFlight = AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID })
    .then(() => {
      interstitialLoaded = true;
    })
    .catch(() => {
      interstitialLoaded = false;
    })
    .finally(() => {
      loadInFlight = null;
    });
}

// Call this when someone exits a recipe (home feed, kitchen feed, or a
// searched dish — anywhere a recipe detail view gets closed). Shows the
// preloaded interstitial if one's ready; if not (e.g. it hasn't finished
// loading yet, or there's no fill from AdMob), it just starts loading one
// for next time instead of making the person wait or blocking the close.
export async function showExitInterstitial() {
  if (!isNative() || !initialized || !interstitialLoaded) {
    preloadInterstitial();
    return;
  }
  interstitialLoaded = false; // this ad is spent either way once shown/attempted
  try {
    await AdMob.showInterstitial();
  } catch (e) {
    // No fill, or it failed to show — never let an ad failure be visible
    // to the person as an error.
  } finally {
    preloadInterstitial();
  }
}
