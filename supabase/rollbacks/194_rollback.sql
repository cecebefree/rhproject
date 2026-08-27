-- ROLLBACK: Migration 194 — profiles enrichment
-- Reverts: surname, email, phone, zone, nation, city, devotional_group columns + trigger

BEGIN;

DROP TRIGGER IF EXISTS trg_set_devotional_group ON public.profiles;
DROP FUNCTION IF EXISTS public.set_devotional_group();

ALTER TABLE public.profiles DROP COLUMN IF EXISTS surname;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS zone;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS nation;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS city;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS devotional_group;

COMMIT;
