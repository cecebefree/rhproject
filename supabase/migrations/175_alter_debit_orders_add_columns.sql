-- Add missing columns to existing debit_orders table
-- The table already exists with: id, student_id, amount, frequency, status, next_debit_date, created_by, updated_by, created_at, updated_at

-- Add invoice_id column (required for RPC, but table may not have invoices FK)
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS invoice_id UUID;

-- Add date columns
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add bank/mandate columns
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS bank_account_id TEXT;
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS mandate_reference TEXT;
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS last_debit_date DATE;

-- Add retry columns
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0;
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 3;
ALTER TABLE public.debit_orders ADD COLUMN IF NOT EXISTS retry_day INT DEFAULT 5;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_debit_orders_student_id ON public.debit_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_debit_orders_invoice_id ON public.debit_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_debit_orders_status ON public.debit_orders(status);
CREATE INDEX IF NOT EXISTS idx_debit_orders_next_debit_date ON public.debit_orders(next_debit_date);

-- Add unique constraint on mandate_reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'debit_orders_mandate_reference_key'
  ) THEN
    ALTER TABLE public.debit_orders ADD CONSTRAINT debit_orders_mandate_reference_key UNIQUE (mandate_reference);
  END IF;
END $$;

-- Add check constraints if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'debit_orders_frequency_check'
  ) THEN
    ALTER TABLE public.debit_orders ADD CONSTRAINT debit_orders_frequency_check CHECK (frequency IN ('monthly', 'term', 'annual'));
  END IF;
END $$;
