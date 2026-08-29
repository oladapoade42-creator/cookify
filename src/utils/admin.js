// Cookify has exactly one admin: whoever's email matches VITE_ADMIN_EMAIL
// (set this in your .env / hosting provider's environment variables).
// This is intentionally simple — a full roles system would be overkill
// for an app with one person managing it.
export function isAdmin(authUser) {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || "";
  if (!adminEmail || !authUser?.email) return false;
  return authUser.email.toLowerCase() === adminEmail.toLowerCase();
}
