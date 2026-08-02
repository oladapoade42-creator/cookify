// Turns a Google account name into a clean, unique Cookify username.
//
// Rules: lowercase letters, numbers, and underscores only, 3-24 chars.
// If the slug is already taken we append "_2", "_3", etc. until we find
// a free one — this is what stops two different people from ending up
// with the same username.

export function slugifyUsername(raw) {
  const base = (raw || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base.length >= 3 ? base : `chef_${base}`.slice(0, 20);
}

// Returns true if `username` is free (not used by anyone else).
// `excludeUserId` lets a user "keep" their own current username when
// re-checking during an edit.
export async function isUsernameAvailable(supabase, username, excludeUserId = null) {
  let query = supabase.from("profiles").select("user_id").eq("username", username).limit(1);
  const { data, error } = await query;
  if (error) {
    // If the profiles/username column isn't set up yet, fail open so the
    // app doesn't hard-block sign-in — see supabase/migrations for the
    // required schema.
    return true;
  }
  if (!data || data.length === 0) return true;
  return excludeUserId ? data[0].user_id === excludeUserId : false;
}

// Finds the next available "base", "base_2", "base_3"... username.
export async function findAvailableUsername(supabase, base, excludeUserId = null) {
  const clean = slugifyUsername(base);
  if (await isUsernameAvailable(supabase, clean, excludeUserId)) return clean;

  for (let i = 2; i <= 50; i++) {
    const candidate = `${clean}_${i}`.slice(0, 24);
    if (await isUsernameAvailable(supabase, candidate, excludeUserId)) return candidate;
  }
  // Extremely unlikely fallback: add a short random suffix.
  return `${clean}_${Math.floor(Math.random() * 10000)}`.slice(0, 24);
}

// Best display-name source from a Supabase auth user object (Google puts
// the person's real name in user_metadata.full_name / name).
export function nameFromAuthUser(user) {
  const meta = user?.user_metadata || {};
  return meta.full_name || meta.name || (user?.email ? user.email.split("@")[0] : "chef");
}
