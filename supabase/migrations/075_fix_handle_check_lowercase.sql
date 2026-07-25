-- 075: fix handle_format_universal CHECK to enforce lowercase (D-062-HANDLE).
-- Original migration014 constraint only checked length + no whitespace;
-- uppercase handles passed the CHECK but were rejected by application intent.
-- DROP + re-ADD with lowercase enforcement (safe: no production handles are uppercase).

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS handle_format_universal;

ALTER TABLE public.profiles
  ADD CONSTRAINT handle_format_universal
  CHECK (handle IS NULL OR (
    char_length(handle) BETWEEN 3 AND 20
    AND handle !~ '\s'
    AND handle = lower(handle)
  ));
