# AO-002 — Safeguarding Pipeline (Row 44)

**Ratified:** 2026-09-05 (draft, for implementation)
**Owner:** Backend Lead (under active council)
**Board:** MASTER-TODO-V2 row 44
**Gates:** G7 — Safeguarding pipeline functional
**Series context:** AO-001–AO-004 are Phase G (agent-operations) Architecture Option documents.
AO-002 covers the safeguarding pipeline for student data protection.

---

## Purpose

The safeguarding pipeline ensures student data is handled with appropriate protections:
- Data minimization: collect only what's needed for educational purpose
- Access control: role-based access to student data (RLS + JWT claims)
- Audit trail: track who accessed what and when
- Retention policy: define how long data is kept
- Parental consent: age-appropriate consent flows

---

## Architecture

### Data Flow

```
Parent/Student → Registration Form → submit-lead EF → leads table
                ↓
Office Desk reviews → approved → enrollment created
                ↓
Student data flows to: school_desk (academic), office_desk (financial)
                ↓
RLS policies enforce role-based access at DB level
```

### Protection Layers

| Layer | Mechanism | Location |
|-------|-----------|----------|
| Transport | HTTPS (Cloudflare) | Edge |
| Authentication | Supabase Auth + JWT | Edge Functions |
| Authorization | RLS policies per schema | PostgreSQL |
| Audit | activity_log table | school_desk, office_desk |
| Retention | Hardcoded in policies | PostgreSQL |

### Role-Based Access

| Role | school_desk | office_desk | front_desk |
|------|-------------|-------------|------------|
| admin | Full | Full | Full |
| teacher | Read (own students) | None | None |
| office | Read (registrations) | Full | Read (leads) |
| student | Read (own data) | None | None |
| family | Read (own children) | None | None |

### Audit Trail

Every write operation logs to `activity_log`:
- Who (user_id from JWT)
- What (operation type)
- When (timestamp)
- Which (table + record_id)

### Data Retention

| Data Type | Retention | Action |
|-----------|-----------|--------|
| leads (archived) | Indefinite | Kept for reference |
| student academic | 7 years | Archive after graduation |
| financial records | 7 years | Tax compliance |
| chat messages | Until soft-deleted | User-initiated |
| activity_log | 2 years | Auto-purge |

### Parental Consent

- Registration form captures parent/guardian info
- Adult profile linked to student via family_accounts
- Consent implied through registration process
- Full GDPR/COPPA compliance deferred to post-MVP

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| RLS policies | DONE | All schemas have RLS enabled |
| Audit logging | DONE | activity_log in school_desk, office_desk |
| Role-based access | DONE | JWT claims + RLS policies |
| Data retention | DEFERRED | Post-MVP |
| Parental consent flows | DEFERRED | Post-MVP |

---

## Gates

| Gate | Description | Status |
|------|-------------|--------|
| G7-1 | RLS enabled on all student data tables | IMPLEMENTED |
| G7-2 | Role-based access enforced via JWT | IMPLEMENTED |
| G7-3 | Audit trail for write operations | IMPLEMENTED |
| G7-4 | Data retention policy defined | DEFERRED |
| G7-5 | Parental consent flow | DEFERRED |

**Status:** G7-1 through G7-3 IMPLEMENTED. G7-4 and G7-5 DEFERRED to post-MVP.

(End of AO-002 v1)
