# Office Desk Architecture — Audit Fixes


## BLOCKER #1: `capacity_slots` missing UNIQUE constraint
**Current:** No uniqueness enforced on (grade, academic_group_id)
**Fix:** Add migration line:
```sql
ALTER TABLE capacity_slots 
ADD CONSTRAINT unique_grade_academic_group 
UNIQUE(grade, academic_group_id);
```


## BLOCKER #2: `realtime.broadcast_changes()` doesn't exist
**Current:** Using fictional Supabase function
**Fix:** Replace all instances with:
```sql
PERFORM pg_notify(
  'office_desk_updates',
  json_build_object(
    'table', 'payments',
    'action', 'insert',
    'data', row_to_json(NEW)
  )::text
);
```


## BLOCKER #3: UUID type mismatch in RLS JWT comparisons
**Current:** `parent_id = auth.jwt()->>'parent_id'` (text vs UUID)
**Fix:** Cast all JWT comparisons:
```sql
parent_id = (auth.jwt()->>'parent_id')::uuid
student_id = (auth.jwt()->>'student_id')::uuid
```


## BLOCKER #4: `process_stripe_payment()` no idempotency guard
**Current:** Can be called twice, sends duplicate events
**Fix:** Add guard at RPC start:
```sql
IF v_payment.status = 'completed' THEN
  RETURN jsonb_build_object('status', 'already_completed');
END IF;
```


## BLOCKER #5: Stripe webhook verification missing
**Current:** RPC accepts unverified stripe_payment_intent_id
**Fix:** Replace RPC with webhook handler:
- Move payment completion to Edge Function
- Verify Stripe signature: `stripe-signature` header
- Only update payment status if signature valid


## BLOCKER #6: Capacity race condition (no SELECT FOR UPDATE)
**Current:** Two concurrent enrollments can overfill slots
**Fix:** Lock capacity_slots row:
```sql
SELECT * FROM capacity_slots 
WHERE grade = p_grade AND academic_group_id = p_academic_group_id
FOR UPDATE;
```


## BLOCKER #7: RPCs callable by any authenticated user
**Current:** `process_stripe_payment()`, `activate_enrollment()` have no role checks
**Fix:** Add to all payment/admin RPCs:
```sql
IF (auth.jwt()->>'role') NOT IN ('office_desk_admin', 'super_admin') THEN
  RAISE EXCEPTION 'Unauthorized: only admin can call this RPC';
END IF;
```


---


## HIGH #1: Missing cascade/soft-delete strategy
**Current:** Hard deletes orphan payments/debit orders
**Fix:** Add soft-delete:
```sql
ALTER TABLE students ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE students ADD CONSTRAINT check_status 
CHECK (status IN ('active', 'terminated'));
-- Replace DELETE with: UPDATE students SET status = 'terminated' WHERE id = ...
```


## HIGH #2: `audit_log` has no immutability enforcement
**Current:** Any admin can UPDATE/DELETE audit entries
**Fix:** Add RLS policy:
```sql
CREATE POLICY audit_log_immutable ON audit_log
FOR ALL USING (FALSE);  -- No one can modify
CREATE POLICY audit_log_insert_only ON audit_log
FOR INSERT WITH CHECK (TRUE);  -- Only insert via trigger
```


## HIGH #3: `super_admin` role undefined
**Current:** Referenced but never defined
**Fix:** Define in migration:
```sql
CREATE ROLE super_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO super_admin;
```


## HIGH #4: `parent` role missing SELECT policy on `parents`
**Current:** Parent cannot read their own record
**Fix:** Add:
```sql
CREATE POLICY parent_own_read ON parents
FOR SELECT USING (id = (auth.jwt()->>'parent_id')::uuid);
```


## HIGH #5: `FOR ALL` policy lets admin write to audit_log
**Current:** office_desk_admin can INSERT into audit_log directly
**Fix:** Replace `FOR ALL` with:
```sql
CREATE POLICY office_desk_admin_write ON students
FOR INSERT, UPDATE, DELETE 
USING (auth.jwt()->>'role' = 'office_desk_admin')
WITH CHECK (auth.jwt()->>'role' = 'office_desk_admin');


-- Do NOT grant write access to audit_log
```


## HIGH #6: No tenant-scoping in any RLS policy
**Current:** Admin from tenant A can read tenant B's data
**Fix:** Add to ALL RLS policies:
```sql
AND tenant_id = (auth.jwt()->>'tenant_id')::uuid
```


## HIGH #7: Edge Function called synchronously from trigger
**Current:** Blocks transaction if function is slow/down
**Fix:** Use async notification instead:
```sql
PERFORM pg_notify('payment_completed', json_build_object(
  'payment_id', NEW.id,
  'student_id', NEW.student_id
)::text);
```


## HIGH #8: GUCs never initialized
**Current:** `app.edge_function_url`, `app.service_role_key` undefined
**Fix:** Set in migration or Supabase secret:
```sql
-- In migration:
DO $$
BEGIN
  PERFORM set_config('app.edge_function_url', 
    'https://your-project.supabase.co/functions/v1/send-payment-notification', 
    false);
END $$;
```


## HIGH #9: Payment auto-activates enrollment without amount check
**Current:** Any payment completion → enrollment active
**Fix:** Check payment amount:
```sql
IF NEW.amount >= (SELECT enrollment_fee FROM academic_groups 
  WHERE id = v_enrollment.academic_group_id) THEN
  UPDATE enrollments SET enrollment_status = 'active' WHERE id = v_enrollment.id;
END IF;
```


## HIGH #10: No decrement on student termination
**Current:** `used_slots` stays incremented forever
**Fix:** Add trigger on students:
```sql
CREATE TRIGGER on_student_terminate
AFTER UPDATE OF status ON students
FOR EACH ROW
WHEN (NEW.status = 'terminated' AND OLD.status != 'terminated')
EXECUTE FUNCTION decrement_capacity_slots();
```


## HIGH #11: `parents` table not audit-logged
**Current:** Parent changes have no audit trail
**Fix:** Add trigger:
```sql
CREATE TRIGGER audit_parents
AFTER INSERT OR UPDATE OR DELETE ON parents
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```


## HIGH #12: Roles JWT-only, no database-side verification
**Current:** Parent can forge student_id in JWT
**Fix:** Store roles in database:
```sql
CREATE TABLE user_roles (
  user_id uuid PRIMARY KEY,
  role text NOT NULL,
  tenant_id uuid NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);


-- RLS checks: AND role = (SELECT role FROM user_roles WHERE user_id = auth.uid())
```


## HIGH #13: `office_desk_admin` can DELETE students
**Current:** Hard delete with no safeguards
**Fix:** Remove DELETE policy, use soft-delete only:
```sql
CREATE POLICY office_desk_admin_delete ON students
FOR DELETE USING (FALSE);  -- Prevent hard deletes


-- Only allow soft-delete via: UPDATE students SET status = 'terminated'
```


## HIGH #14: Parent can forge student_id via JWT
**Current:** `student_own_read` checks raw JWT, not join table
**Fix:** Use parent_children_read approach:
```sql
CREATE POLICY student_own_read ON students
FOR SELECT USING (
  id IN (SELECT student_id FROM parent_children WHERE parent_id = (auth.jwt()->>'parent_id')::uuid)
);
```


---


## MEDIUM #1: `reserved_slots` can go negative
**Current:** No CHECK constraint
**Fix:**
```sql
ALTER TABLE capacity_slots
ADD CONSTRAINT check_reserved_non_negative CHECK (reserved_slots >= 0);
```


## MEDIUM #2: No audit read access for parent/student
**Current:** Parents cannot view their own audit trail
**Fix:** Add RLS:
```sql
CREATE POLICY student_own_audit_read ON audit_log
FOR SELECT USING (
  changed_record->>'student_id' = (auth.jwt()->>'student_id')::uuid::text
);
```


## MEDIUM #3: No sync conflict detection
**Current:** School Desk sync conflicts have no resolution
**Fix:** Add version column:
```sql
ALTER TABLE students ADD COLUMN sync_version INTEGER DEFAULT 1;
-- On conflict, check: IF sync_version > remote_version THEN reject update
```


## MEDIUM #4: `ip_address` never populated
**Current:** Always NULL in audit_log
**Fix:** Either remove column or set via GUC before operation:
```sql
SET app.client_ip_address = '192.168.1.1';
-- In trigger: ip_address := current_setting('app.client_ip_address', true),
```


## MEDIUM #5: No reservation TTL cleanup
**Current:** Abandoned enrollments lock capacity forever
**Fix:** Add scheduled job:
```sql
-- Run daily via pg_cron:
SELECT cron.schedule('cleanup_reservations', '0 0 * * *', $$
  UPDATE capacity_slots
  SET reserved_slots = reserved_slots - 1
  WHERE id IN (
    SELECT cs.id FROM capacity_slots cs
    JOIN enrollments e ON e.academic_group_id = cs.academic_group_id
    WHERE e.enrollment_status = 'pending'
    AND e.created_at < NOW() - INTERVAL '7 days'
  );
$$);
```


---


## LOW #1: Trigger fires on all status updates
**Current:** `on_payment_completed` triggers on every UPDATE
**Fix:** Add WHEN clause:
```sql
CREATE TRIGGER on_payment_completed
AFTER UPDATE OF status ON payments
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION on_payment_completed();
```


## LOW #2: Full-row storage in audit_log
**Current:** Stores entire row in JSON
**Fix (optional):** Store delta only:
```sql
old_values := (SELECT to_jsonb(OLD) - to_jsonb(NEW)),
new_values := to_jsonb(NEW)
```


## LOW #3: Recursive audit from trigger-modified rows
**Current:** Trigger modifies students → audit fires again
**Fix (optional):** Guard with GUC:
```sql
IF current_setting('app.skip_audit', 'false') = 'true' THEN RETURN; END IF;
```


---


## Next Action
Apply all fixes to `office-desk-architecture.md`, then re-submit for audit.
