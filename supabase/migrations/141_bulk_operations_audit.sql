-- ═══════════════════════════════════════════════════════════
-- ROW 18: BULK OPERATIONS AUDIT TABLE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS office_desk.bulk_operation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_lms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Operation details
  operation_type TEXT NOT NULL CHECK (operation_type IN ('bulk_edit', 'bulk_delete', 'bulk_assign', 'bulk_status_change')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'invoice')),
  entity_ids UUID[] NOT NULL,
  
  -- What changed
  old_values JSONB,
  new_values JSONB,
  
  -- Undo support
  is_undoable BOOLEAN DEFAULT TRUE,
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  total_affected INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_bulk_op_history_tenant 
  ON office_desk.bulk_operation_history(tenant_id);

CREATE INDEX IF NOT EXISTS idx_bulk_op_history_user 
  ON office_desk.bulk_operation_history(user_id);

CREATE INDEX IF NOT EXISTS idx_bulk_op_history_entity 
  ON office_desk.bulk_operation_history(entity_type, entity_ids);

CREATE INDEX IF NOT EXISTS idx_bulk_op_history_undoable 
  ON office_desk.bulk_operation_history(is_undoable) 
  WHERE is_undoable = TRUE AND undone_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

ALTER TABLE office_desk.bulk_operation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bulk operations" 
  ON office_desk.bulk_operation_history
  FOR SELECT
  USING (
    tenant_id = (SELECT id FROM public.tenant_lms WHERE slug = current_setting('request.jwt.claims', true)::json->>'tenant_id')
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can create bulk operations" 
  ON office_desk.bulk_operation_history
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT id FROM public.tenant_lms WHERE slug = current_setting('request.jwt.claims', true)::json->>'tenant_id')
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own bulk operations" 
  ON office_desk.bulk_operation_history
  FOR UPDATE
  USING (
    tenant_id = (SELECT id FROM public.tenant_lms WHERE slug = current_setting('request.jwt.claims', true)::json->>'tenant_id')
    AND user_id = auth.uid()
  );

-- ═══════════════════════════════════════════════════════════
-- HELPER: Undo bulk operation
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION office_desk.undo_bulk_operation(p_operation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_operation office_desk.bulk_operation_history%ROWTYPE;
  v_entity_id UUID;
  v_old_value JSONB;
  v_field TEXT;
BEGIN
  -- Get the operation
  SELECT * INTO v_operation
  FROM office_desk.bulk_operation_history
  WHERE id = p_operation_id
    AND is_undoable = TRUE
    AND undone_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check for bulk_delete - restore soft-deleted records
  IF v_operation.operation_type = 'bulk_delete' THEN
    IF v_operation.entity_type = 'lead' THEN
      FOREACH v_entity_id IN ARRAY v_operation.entity_ids LOOP
        UPDATE front_desk.leads SET archived_at = NULL WHERE id = v_entity_id AND tenant_id = v_operation.tenant_id;
      END LOOP;
    ELSIF v_operation.entity_type = 'contact' THEN
      FOREACH v_entity_id IN ARRAY v_operation.entity_ids LOOP
        UPDATE office_desk.contacts SET archived_at = NULL WHERE id = v_entity_id AND tenant_id = v_operation.tenant_id;
      END LOOP;
    ELSIF v_operation.entity_type = 'invoice' THEN
      FOREACH v_entity_id IN ARRAY v_operation.entity_ids LOOP
        UPDATE office_desk.invoices SET deleted_at = NULL WHERE id = v_entity_id AND tenant_id = v_operation.tenant_id;
      END LOOP;
    END IF;
  
  -- Check for bulk_status_change or bulk_edit - restore old values
  ELSIF v_operation.operation_type IN ('bulk_status_change', 'bulk_edit') THEN
    IF v_operation.old_values IS NOT NULL THEN
      FOR v_field IN SELECT jsonb_object_keys(v_operation.old_values)
      LOOP
        v_old_value := v_operation.old_values->v_field;
        
        IF v_operation.entity_type = 'lead' THEN
          FOREACH v_entity_id IN ARRAY v_operation.entity_ids LOOP
            EXECUTE format(
              'UPDATE front_desk.leads SET %I = $1 WHERE id = $2 AND tenant_id = $3',
              v_field
            ) USING v_old_value, v_entity_id, v_operation.tenant_id;
          END LOOP;
        ELSIF v_operation.entity_type = 'contact' THEN
          FOREACH v_entity_id IN ARRAY v_operation.entity_ids LOOP
            EXECUTE format(
              'UPDATE office_desk.contacts SET %I = $1 WHERE id = $2 AND tenant_id = $3',
              v_field
            ) USING v_old_value, v_entity_id, v_operation.tenant_id;
          END LOOP;
        ELSIF v_operation.entity_type = 'invoice' THEN
          FOREACH v_entity_id IN ARRAY v_operation.entity_ids LOOP
            EXECUTE format(
              'UPDATE office_desk.invoices SET %I = $1 WHERE id = $2 AND tenant_id = $3',
              v_field
            ) USING v_old_value, v_entity_id, v_operation.tenant_id;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  
  -- Check for bulk_assign - restore old assigned_to
  ELSIF v_operation.operation_type = 'bulk_assign' THEN
    IF v_operation.old_values->>'assigned_to' IS NOT NULL THEN
      IF v_operation.entity_type = 'lead' THEN
        FOREACH v_entity_id IN ARRAY v_operation.entity_ids LOOP
          UPDATE front_desk.leads SET assigned_to = (v_operation.old_values->>'assigned_to')::UUID 
          WHERE id = v_entity_id AND tenant_id = v_operation.tenant_id;
        END LOOP;
      ELSIF v_operation.entity_type = 'contact' THEN
        FOREACH v_entity_id IN ARRAY v_operation.entity_ids LOOP
          UPDATE office_desk.contacts SET assigned_to = (v_operation.old_values->>'assigned_to')::UUID 
          WHERE id = v_entity_id AND tenant_id = v_operation.tenant_id;
        END LOOP;
      END IF;
    END IF;
  END IF;
  
  -- Mark as undone
  UPDATE office_desk.bulk_operation_history
  SET undone_at = NOW(),
      undone_by = auth.uid()
  WHERE id = p_operation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;