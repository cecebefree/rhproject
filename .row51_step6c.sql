SELECT tgname, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgname = 'trg_leads_updated_at' AND tgrelid = 'front_desk.leads'::regclass;
