-- Migration 026: Crossing-gate columns for profiles
-- RULE 1+2: role NOT NULL + 8-value enum (extensible gate)
-- RULE 3: registration_status NOT NULL + CHECK
-- RULE 4: consent_given BOOLEAN NOT NULL default FALSE
-- Extensible: add new rules by appending CHECK constraints or columns here.

BEGIN;

-- RULE 1+2: Expand role CHECK to 8 valid types
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'student',
    'outside_student',
    'family',
    'alumni',
    'teacher',
    'expert',
    'guest',
    'admin'
  ));

-- RULE 3: registration_status
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_status text
  NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_registration_status_check
  CHECK (registration_status IN ('pending', 'approved', 'rejected'));

-- RULE 4: consent_given (UK Children's Code / UK GDPR)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_given boolean
  NOT NULL DEFAULT FALSE;

COMMIT;
