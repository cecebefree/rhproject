-- Migration 182: Office Desk Corrected Schema — Indexes
-- Performance indexes on all FK columns + query optimization indexes

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════════
-- FAMILY_ACCOUNTS indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_fa_tenant ON office_desk.family_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fa_status ON office_desk.family_accounts(status);
CREATE INDEX IF NOT EXISTS idx_fa_family_code ON office_desk.family_accounts(family_code);

-- ══════════════════════════════════════════════════════════════════════════════
-- USERS indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_tenant ON office_desk.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_family ON office_desk.users(family_account_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON office_desk.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_type ON office_desk.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON office_desk.users(status);

-- ══════════════════════════════════════════════════════════════════════════════
-- STUDENTS indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_students_tenant ON office_desk.students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_family ON office_desk.students(family_account_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON office_desk.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON office_desk.students(grade);
CREATE INDEX IF NOT EXISTS idx_students_status ON office_desk.students(status);
CREATE INDEX IF NOT EXISTS idx_students_pack ON office_desk.students(pack_choice);

-- ══════════════════════════════════════════════════════════════════════════════
-- PACKAGES indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_pkg_tenant ON office_desk.packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pkg_name ON office_desk.packages(package_name);
CREATE INDEX IF NOT EXISTS idx_pkg_grade ON office_desk.packages(grade);
CREATE INDEX IF NOT EXISTS idx_pkg_status ON office_desk.packages(status);

-- ══════════════════════════════════════════════════════════════════════════════
-- INVOICES indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_inv_tenant ON office_desk.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_family ON office_desk.invoices(family_account_id);
CREATE INDEX IF NOT EXISTS idx_inv_number ON office_desk.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_inv_status ON office_desk.invoices(status);
CREATE INDEX IF NOT EXISTS idx_inv_type ON office_desk.invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_inv_due ON office_desk.invoices(due_date);

-- ══════════════════════════════════════════════════════════════════════════════
-- DEBIT_ORDERS indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_dbo_tenant ON office_desk.debit_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dbo_family ON office_desk.debit_orders(family_account_id);
CREATE INDEX IF NOT EXISTS idx_dbo_student ON office_desk.debit_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_dbo_package ON office_desk.debit_orders(package_id);
CREATE INDEX IF NOT EXISTS idx_dbo_invoice ON office_desk.debit_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dbo_status ON office_desk.debit_orders(status);
CREATE INDEX IF NOT EXISTS idx_dbo_next_debit ON office_desk.debit_orders(next_debit_date);

-- ══════════════════════════════════════════════════════════════════════════════
-- PAYMENTS indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_pay_tenant ON office_desk.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pay_family ON office_desk.payments(family_account_id);
CREATE INDEX IF NOT EXISTS idx_pay_type ON office_desk.payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_pay_status ON office_desk.payments(status);
CREATE INDEX IF NOT EXISTS idx_pay_date ON office_desk.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_pay_ref ON office_desk.payments(reference_code);

-- ══════════════════════════════════════════════════════════════════════════════
-- ADD_ON_PAYMENTS indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_addon_tenant ON office_desk.add_on_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_addon_family ON office_desk.add_on_payments(family_account_id);
CREATE INDEX IF NOT EXISTS idx_addon_student ON office_desk.add_on_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_addon_invoice ON office_desk.add_on_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_addon_status ON office_desk.add_on_payments(status);

-- ══════════════════════════════════════════════════════════════════════════════
-- FAMILY_ACTIVITY indexes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_fam_tenant ON office_desk.family_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fam_family ON office_desk.family_activity(family_account_id);
CREATE INDEX IF NOT EXISTS idx_fam_student ON office_desk.family_activity(student_id);
CREATE INDEX IF NOT EXISTS idx_fam_invoice ON office_desk.family_activity(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fam_debit ON office_desk.family_activity(debit_order_id);
CREATE INDEX IF NOT EXISTS idx_fam_action ON office_desk.family_activity(action);
CREATE INDEX IF NOT EXISTS idx_fam_timestamp ON office_desk.family_activity(timestamp DESC);

COMMIT;
