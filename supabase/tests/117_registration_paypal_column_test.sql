BEGIN;
  SELECT plan(2);
  
  SELECT has_column('office_desk'::name, 'registrations'::name, 'paypal_transaction_id'::name, 'Column paypal_transaction_id exists');
  SELECT col_type_is('office_desk'::name, 'registrations'::name, 'paypal_transaction_id'::name, 'text'::name);
  
  SELECT * FROM finish();
COMMIT;
