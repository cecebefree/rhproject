# ITEM-011 — Architecture Pivot: Single Supabase with Schema Namespaces

| Field | Value |
|-------|-------|
| **Status** | LOCKED — Cece decision 2026-08-11 |
| **Ruled by** | Cece |
| **Date** | 2026-08-11 |
| **Supersedes** | Row 50 (original two-project architecture lock) |
| **Source** | Independent Consultant + CFO recommendation; Security Lead REJECT on two-project design |

## Summary

The three-service-desk architecture pivots from **two separate Supabase projects** to a **single Supabase project with schema namespaces**. This preserves the verified architecture (99+ migrations, 152/152 pgTAP tests), eliminates migration risk, and reduces cost.

## Architecture

```
SINGLE SUPABASE PROJECT (existing)
├── public/           # Shared: profiles, tenants, auth (existing)
├── front_desk/       # leads, callbacks, intake_forms (RLS: front_desk_role)
├── school_desk/      # courses, enrollments, report_cards, announcements, chat (RLS: school_role)
├── office_desk/      # invoices, payments, registrations (RLS: office_role)
└── mobile/           # READ-ONLY views / RPCs (existing, reads school_desk + office_desk)
```

## What Changed

| Original Plan (CANCELLED) | New Plan |
|---------------------------|----------|
| Provision separate Front Desk Supabase (row 51) | Create `front_desk` schema in existing project (row 51) |
| Migrate leads DDL to new project (row 52) | `ALTER TABLE public.leads SET SCHEMA front_desk` (row 52) |
| Export/import leads data (row 53) | No data migration needed — table stays in same DB |
| Redeploy EF to new project (row 54) | Update EF queries to schema-qualified paths (row 56) |
| Drop leads from School Supabase (row 55) | Leads move to front_desk schema — no drop needed |
| Update callers to new endpoint (row 56) | Lovable connects to same Supabase URL (row 65) |
| Archived leads duplicated into School (row 76) | Leads stay in front_desk, referenced by office_desk via lead_reference_id (row 80) |

## Why

1. **Independent Consultant benchmark**: Two-database pattern not justified for 3 desks under one white-label. Industry standard is single PG + RLS.
2. **CFO cost analysis**: Two-project TCO +$75-175/mo recurring + $20k one-time migration unjustified.
3. **Security Lead REJECT**: Two-project design created auth isolation gaps, EF auth design issues, data duplication compliance risks.
4. **Verified architecture preserved**: 99+ migrations, 152/152 pgTAP tests, all RLS policies remain valid with schema-qualified updates.
5. **Lovable compatibility**: Lovable supports custom Supabase URL/key — no architectural requirement for separate project.

## Security Lead Findings Resolved

| Finding | Resolution |
|---------|------------|
| No RLS on Front Desk | Single-project RLS applies; new policies for front_desk schema (row 58) |
| EF auth design gap | Single-project: EF reads JWT directly, no cross-project token exchange needed (row 57) |
| Permission matrix missing | Defined in row 59: desk × role × {read, write, transition, archive} |
| Data duplication compliance | No duplication: leads stay in front_desk, referenced by office_desk via lead_reference_id (row 80) |
| Pattern B enumeration | Rate limiting + Turnstile on registration EF (row 61) |

## Governance Note

This ruling supersedes the original row 50 (two-project architecture lock). The three-desk model and all desk scope decisions remain unchanged — only the infrastructure topology changed. ITEM-010 (report cards to School Front Desk) is unaffected.

Rows 51-56 (original second-project migration) are CANCELLED in MASTER-TODO-V2.md. New rows 51-56 (schema namespace setup) replace them.
