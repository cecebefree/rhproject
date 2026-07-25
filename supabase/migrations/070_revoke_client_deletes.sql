-- ITEM-54: revoke client-path DELETE where no dedicated policy
-- exists or doctrine forbids deletion (immutable records).
REVOKE DELETE ON public.report_cards    FROM authenticated;
REVOKE DELETE ON public.consent_records FROM authenticated;
REVOKE DELETE ON public.messages        FROM authenticated;
REVOKE DELETE ON public.certificates    FROM authenticated;
