-- Contract signing and management functions

-- Sign a contract (admin marks as signed)
CREATE OR REPLACE FUNCTION public.sign_contract(
  p_contract_id UUID,
  p_signed_by UUID DEFAULT NULL
)
RETURNS TABLE(status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract RECORD;
BEGIN
  SELECT * INTO v_contract
    FROM public.contracts
    WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract % not found', p_contract_id;
  END IF;

  IF v_contract.status NOT IN ('draft', 'pending_signature') THEN
    RAISE EXCEPTION 'Contract % cannot be signed (current status: %)', p_contract_id, v_contract.status;
  END IF;

  UPDATE public.contracts
  SET status = 'active',
      signed_at = now(),
      signed_by = COALESCE(p_signed_by, auth.uid()),
      start_date = COALESCE(start_date, now())
  WHERE id = p_contract_id;

  RETURN QUERY SELECT 'signed'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.sign_contract(UUID, UUID)
  IS 'Sign a contract — moves status from draft/pending_signature to active.';

-- Update contract dates
CREATE OR REPLACE FUNCTION public.update_contract_dates(
  p_contract_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.contracts
  SET start_date = p_start_date,
      end_date = p_end_date
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract % not found', p_contract_id;
  END IF;

  RETURN QUERY SELECT 'updated'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.update_contract_dates(UUID, DATE, DATE)
  IS 'Update contract start and end dates.';

GRANT EXECUTE ON FUNCTION public.sign_contract(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_contract_dates(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_contract_dates(UUID, DATE, DATE) TO service_role;
