import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // This is almost always a deployment env-var issue, not a code bug —
  // .env files are gitignored so they never reach Vercel/Netlify/etc.
  // unless VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are added directly
  // in the hosting provider's dashboard. Logging loudly here beats the
  // silent "OAuth token in URL but user stays logged out" failure mode.
  console.error(
    '[Cookify] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Google/Apple sign-in will not work until these are set in your ' +
    'hosting provider\'s environment variables (not just your local .env).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})