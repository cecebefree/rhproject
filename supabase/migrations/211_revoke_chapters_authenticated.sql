-- Revoke authenticated SELECT on chapters (force RPC)
REVOKE SELECT ON public.chapters FROM authenticated;
