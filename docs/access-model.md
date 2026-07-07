# Redhouse Access & Authorization Specification
Status: Final · Scope: Tenant-scoped (Redhouse, tenant #1)
Source of truth: Supabase

## 1. Overview
User access is never controlled by the end user. The user's only input 
is their enrolment selection (what they sign up for). All access grants, 
changes, and restrictions are system-derived and administratively 
governed, with Supabase as the single source of truth and the mobile 
application as a read-only presentation layer.

## 2. The Front Gate
Redhouse is a closed, registered-only application with a single entrance 
governed by the four-rule crossing gate:
- A role is allocated to the record.
- The role is one of the eight valid user types.
- Registration is completed and approved.
- Children's-data consent is captured (UK Children's Code / UK GDPR).
A record may only cross into Supabase once all four rules are satisfied. 
This is a one-way gate: after crossing, Supabase owns the identity and any 
upstream CRM is a read-only view layer.

## 3. Roles and Responsibilities
- User: controls ONLY the enrolment selection (subjects, clubs, role at 
  sign-up). Cannot alter access.
- Mobile app: validates identity, requests access state from Supabase, and 
  displays results. Holds no truth and runs no logic (bouncer + mirror).
- Supabase: derives, stores, and serves the authoritative access state.
- Office Desk: the ONLY surface authorized to change access (grant or 
  restrict), writing all updates to Supabase.

## 4. Access Grant Model — Derive + Override (Two-Way)
Grant sequence:
- Sign-up: user selects subjects, clubs, role.
- Commitment: selection is bound to a contract.
- Payment: the associated fee is settled.
- Grant: once sign-up is connected to a confirmed contract and payment, 
  Supabase derives and stamps the access set and saves it against the user.
Access is always the result of a confirmed, paid enrolment. No contract 
and payment means no access.

Override — both directions (Office Desk only, written to Supabase):
- GRANT: add subject/club, upgrade, contract extension → enable access.
- RESTRICT: payment failure, contract issue, technical/data problem → 
  disable access (door off) with a stated reason and admin contact path.
All overrides are reflected read-only in the user profile.

## 5. Access Window
Every grant carries an access-granted date and an access-expiry date. 
Access is live only within this window. On expiry or restriction, access 
is blocked with a stated reason and an admin contact path. All in-year 
changes inherit the current access-year window and expire with that year. 
No change produces open-ended access.

## 6. Access Classes
- Core: authoritative enrolment (student_class) — paid, scheduled, live.
- Sup: authoritative enrolment (student_class) — clubs, enrichment, 
  music & art.
- Social: group-membership link presence (Chat, Hub, OTT, community).
- School: registered-role presence (post-gate in-app surfaces).
- Newsletter: segment link presence (outbound reference).

## 7. Profile as Read-Only Mirror
The user profile presents what is open to the user — enrolled subjects, 
active access classes, current booklist, access window. It reflects 
Supabase state via the access endpoint and controls nothing. Office Desk 
changes propagate to Supabase and are then mirrored in the profile.

## 8. Roll-Over vs In-Year Change
- Annual roll-over: yearly reset; rebuilds a fresh access window (subjects, 
  clubs, booklist, schedule) by year and stage.
- In-year change: live edit inside the current access year via the Office 
  Desk; inherits the current window; expires with the year.

## 9. Governing Principles
- The user controls only what they sign up for.
- Access is granted on confirmed contract + payment, derived and stamped 
  at registration.
- Access is set once, changeable only by the Office Desk, in both 
  directions (grant and restrict).
- Supabase is the sole source of truth; the CRM is read-only post-gate.
- The mobile app validates and displays only; it holds no truth and runs 
  no logic.
- All access is bound to the current access-year window.
