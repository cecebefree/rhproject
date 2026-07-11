# Front Desk — Registration Pipeline Specification
Status: RULED — decisions final, implementation pending (Mobile/Desks phase)
Recorded: 2026-07-11 (three-week plan close, carried forward)

## 1. Split Pipeline — wo Ownership Zones, Two Owners

The registration flow is split at the PAYMENT boundary:

### Pre-payment (Front Desk domain)
- Lives in Front Desk-OWNED lead tables (NOT the core registration table)
- Stages: enquiry → qualified → invoiced
- Front Desk has full read/write authority over lead records
- Leads are working objects: notes, follow-ups, callback scheduling

### Post-payment (Office Desk domain)
- Lives in the CORE registration status column
- States: pending_init → pending_review → approved → active
  plus terminal states: withdrawn, rejected
- Payment confirmation is the trigger that creates the core
  registration record from the lead

## 2. Write Authority — HARD RULE

- ONLY Office Desk holds write authority over the core registration
  status column
- ALL status mutations go through Edge Functions — NO direct UI
  table writes, no exceptions
- Front Desk NEVER writes to core registration status; it reads
  status for visibility only
- School Desk: read-only on registration status

## 3. Desk Roles in the Pipeline

| Desk        | Role in registration                                  |
|-------------|-------------------------------------------------------|
| Front Desk  | Owns leads (enquiry/qualified/invoiced), intake triage,
                callback queue, converts on payment                    |
| Office Desk | Owns core status transitions via Edge Functions,
                review/approval, withdrawal/rejection processing       |
| School Desk | Consumes approved/active registrations (class placement);
                no pipeline writes                                     |

## 4. Intake Channel

- Web intake form (Lovable-built) feeds the Front Desk lead table
- Payments are MOCKED in MVP — the lead→registration conversion
  trigger is simulated for the mid-August demo
- Global Desk callback model applies to lead follow-up:
  time-zone rotated queues (USA, UK, SA, Singapore, Australia)

## 5. Data Retention Disclosures (ruled, must ship with UI)

- Registration and Settings surfaces MUST disclose: records are
  retained due to contractual obligations; we do not delete
- Third-party interaction data (CRM chat, Hub comments, etc.) is
  NOT retained by us — processed by sub-processors under a DPA
- These disclosures are part of the registration UI acceptance
  criteria, not an afterthought

## 6. Open Items (for Mobile/Desks phase planning)

- [ ] Edge Function catalogue for each status transition
      (name, payload, authority check per transition)
- [ ] Lead table schema finalization (Front Desk-owned, tenant-scoped)
- [ ] Mock-payment trigger design for demo conversion
- [ ] Withdrawn/rejected handling: retention disclosure wording final
- [ ] RLS review: Front Desk lead tables vs core registration
      visibility boundaries

## 7. Insertion Point

This spec is a REGISTERED INPUT to the Mobile phase plan, alongside
P2-026, D19, and the devotional content build. The three staff desks
(Front, School, Office) are in MVP scope; this document governs the
registration slice of that build.
