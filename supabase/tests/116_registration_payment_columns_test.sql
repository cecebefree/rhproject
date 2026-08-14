BEGIN;
  SELECT plan(6);
  
  SELECT has_column('office_desk'::name, 'registrations'::name, 'payment_attached_at'::name, 'Column payment_attached_at exists');
  SELECT has_column('office_desk'::name, 'registrations'::name, 'stripe_customer_id'::name, 'Column stripe_customer_id exists');
  SELECT has_column('office_desk'::name, 'registrations'::name, 'stripe_charge_id'::name, 'Column stripe_charge_id exists');
  
  SELECT col_type_is('office_desk'::name, 'registrations'::name, 'payment_attached_at'::name, 'timestamp with time zone'::name);
  SELECT col_type_is('office_desk'::name, 'registrations'::name, 'stripe_customer_id'::name, 'text'::name);
  SELECT col_type_is('office_desk'::name, 'registrations'::name, 'stripe_charge_id'::name, 'text'::name);
  
  SELECT * FROM finish();
COMMIT;
