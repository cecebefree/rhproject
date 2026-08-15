# Deployment Log

## 2026-08-15 — Migration 127 (Row 65: Front Desk Lovable Screens)

**Time:** 2026-08-15 (session start)
**Commit:** `52aec8b`
**Migrations applied:** 121, 122, 123, 124, 125, 126, 127

### Migrations Pushed

| Migration | Description | Status |
|-----------|-------------|--------|
| 121_teacher_report_card_rls.sql | Teacher RLS for report_cards (fixed `school_desk.student_class` → `public.student_class`) | APPLIED |
| 122_school_desk_payment_requests_table.sql | Payment requests table | APPLIED |
| 123_school_desk_attendance_table.sql | Attendance table | APPLIED |
| 124_school_desk_gradebook_tables.sql | Gradebook tables (assignments + gradebook) | APPLIED |
| 125_parent_student_link_table.sql | Parent-student link + parent RLS | APPLIED |
| 126_log_events_table.sql | Webhook debug logging (fixed `supabase.log_events` → `public.log_events`) | APPLIED |
| 127_front_desk_leads_company_column.sql | Add `company` column to `front_desk.leads` | APPLIED |

### Fixes Applied During Push

1. **Migration 121:** Changed `school_desk.student_class` → `public.student_class` (table was never moved from public schema)
2. **Migration 126:** Changed `supabase.log_events` → `public.log_events` (`supabase` schema doesn't exist on hosted)

### Verification

- **pgTAP:** 464/464 PASS (45 files)
- **TypeScript:** Clean (0 errors)
- **Migration list:** All local migrations match remote (013–127)

### Row 65 Component Summary

| Component | Status |
|-----------|--------|
| LeadIntakeForm (company field added) | DEPLOYED |
| LeadDetail (editable form, archive/call/email) | DEPLOYED |
| LeadList (action buttons, filter integration) | DEPLOYED |
| LeadFilterPanel (status, source, date range) | DEPLOYED |
| LeadArchiveList (archived leads, restore) | DEPLOYED |
| useKeyboardShortcuts (Cmd+N/K/Shift+A) | DEPLOYED |
| FrontDeskPage (3 tabs + modal detail) | DEPLOYED |

### Environment Variables Required (for Stripe/PayPal webhooks)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
