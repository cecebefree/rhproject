# Gate Contracts v1: release-report-card EF

**Document ID**: GC-001  
**Target**: Supabase Edge Function `release-report-card` (row 28b)  
**Authority**: office/admin role ONLY may advance report card status  
**Tenant Isolation**: caller.tenant_id MUST match report_card.tenant_id  
**Immutability**: once a report card is beyond draft, subject content is not editable via this EF - it advances status only

## Scope

This document defines the transition rules and authority matrix for the `release-report-card` Edge Function, implementing the two-step status advance: `draft → released → visible`.

**EXPLICITLY OUT OF SCOPE**:
- Examiner role-vs-flag remains a PARKED DEBT. 
  <br>  **Examiner v2 extension point:** This EF v1 covers office/admin transitions only. Examiner sign-off bridge: a new extension point with field `examiner_signoff_required: true` for Phase B and beyond, not in this v1 contract.
- Report card RLS debt — separate row, do not touch policies beyond what the EF strictly needs.
- 28a set_handle — separate session.

## Authority Gates

### Role-Based Authority

| Role | Transitions Allowed | Authority Level |
|------|-------------------|-----------------|
| admin | draft→released, released→visible | Full authority |
| office | draft→released only | Limited to release |
| student | None | No access |
| instructor | None | No access |
| learner | None | No access |