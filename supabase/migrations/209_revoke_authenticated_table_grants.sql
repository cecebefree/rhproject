-- Revoke table-level grants on authenticated role
-- Force all access through RLS policies only

REVOKE ALL ON public.profiles FROM authenticated;
REVOKE ALL ON public.website_leads FROM authenticated;
REVOKE ALL ON public.chapters FROM authenticated;
REVOKE ALL ON school_desk.enrollments FROM authenticated;
REVOKE ALL ON school_desk.courses FROM authenticated;

-- Grant back only SELECT (RLS will gate rows)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.website_leads TO authenticated;
GRANT SELECT ON public.chapters TO authenticated;
GRANT SELECT ON school_desk.enrollments TO authenticated;
GRANT SELECT ON school_desk.courses TO authenticated;

-- website_leads needs UPDATE for the insert_website_lead RPC
GRANT UPDATE ON public.website_leads TO authenticated;
