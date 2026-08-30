# Cookify — env var name fallbacks (Supabase's newer key naming)

3 files: all three edge functions (overwrite).

Made every function check both possible names for the service-role key
(SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS — your secrets list
showed the newer name) and the webhook secret (FLW_WEBHOOK_SECRET or
FLW_SECRET_HASH — you already have the second one set). No need to
rename anything you've already added; the code now works with what's
actually there.

This does NOT fix the missing FLW_SECRET_KEY — that one has to be added,
see the main reply for where to get it.
