// Namespaces localStorage keys per signed-in user.
//
// Why this file exists: profile info (username, photo, accent color) and
// progress (favorites, XP, streak, cooked list) used to be saved under
// plain keys like "cookify_username". Because localStorage is shared by
// the whole browser, the moment someone logged out and signed in with a
// *different* Google account, they'd still see the previous person's
// username/photo/favorites — it looked like "the same account" because,
// from localStorage's point of view, it was.
//
// The fix is to suffix every per-person key with the Supabase user id
// (or "guest" for guest sessions, which intentionally don't persist across
// different guests on the same device — guests were never tied to an
// account in the first place).

export function userScope(authUser) {
  return authUser?.id || "guest";
}

export function userKey(authUser, baseKey) {
  return `${baseKey}::${userScope(authUser)}`;
}

export function getUserItem(authUser, baseKey) {
  return localStorage.getItem(userKey(authUser, baseKey));
}

export function setUserItem(authUser, baseKey, value) {
  localStorage.setItem(userKey(authUser, baseKey), value);
}

export function removeUserItem(authUser, baseKey) {
  localStorage.removeItem(userKey(authUser, baseKey));
}

// One-time migration: if this browser still has data under the old,
// unscoped key (from before this fix), move it onto the *current* user's
// scoped key, then delete the old key so a future, different account can
// never inherit it. This preserves existing users' data exactly once.
export function migrateLegacyKey(authUser, baseKey) {
  try {
    const legacy = localStorage.getItem(baseKey);
    if (legacy === null) return;
    const scopedKey = userKey(authUser, baseKey);
    if (localStorage.getItem(scopedKey) === null) {
      localStorage.setItem(scopedKey, legacy);
    }
    localStorage.removeItem(baseKey);
  } catch (e) {
    // best-effort — never block login on a migration failure
  }
}

export const LEGACY_USER_KEYS = [
  "cookify_favorites",
  "cookify_progress",
  "cookify_cooked_list",
  "cookify_profile_photo",
  "cookify_username",
  "cookify_accent_color",
];

export function migrateAllLegacyKeys(authUser) {
  LEGACY_USER_KEYS.forEach((k) => migrateLegacyKey(authUser, k));
}
