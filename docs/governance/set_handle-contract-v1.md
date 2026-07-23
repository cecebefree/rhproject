# docs: ROW 28a set_handle EF — Governance Contract Entry

**Contract:** docs/governance/ENTRY-FOR-SET_HANDLE-RULES.V1.md (versioning V1)

## Validation Rules Table (server-side, enforced by set_handle EF)

| Rule | Validation | Error Code |
|------|------------|------------|
| **Format** | `a-z0-9_-` regex only; no whitespace | 400 |
| **Length** | 3-20 chars (universal CHECK from migration 062) | 400 |
| **Reserved Names** | Non-permit list (admin, office, system, support, root, api, redhouse + variants) | 400 |
| **Uniqueness** | Per-tenant unique (profiles.tenant_id + lower(handle)) | 409 |
| **Authorization** | Caller must be owner or admin/office within same tenant | 403 |
| **Target existence** | Profile must exist in DB | 404 |

## Authority Matrix

| Caller Role | Can Set | Targets Scope |
|-------------|---------|---------------|
| **authenticated** (owner) | Own profile only | `caller.id == target.id && tenant_id matches` |
| **admin** | Any profile in own tenant | `tenant_id matches` |
| **office** | Any profile in own tenant | `tenant_id matches` |
| **student/learner/other** | None (not in matrix) | — |

## Reserved Name List (Deny-list)

admin, admin1, admin2, admin3, admin_main,
office, office, office_admin,
nsystem, support, support1, support2, root, api, apigateway, api-gateway,
redhouse, redhouse1, redhouse2, redhouse_dev
sys, sysadmin, system_admin, system_service

## Test Requirements Matrix

| Path | Input | Expect | Test Case |
|------|-------|--------|----------|
| OPTIONS | — | 200 | CORS preflight accepts |
| GET | — | 405 | Method not allowed |
| No auth | `{"profile_id":"...","handle":"foo"}` | 401 | Missing valid auth token |
| Own handle valid | own_id, valid_handle | 200 | Self-set success with audit row |
| Other user (plain) | other_id, valid_handle | 403 | Non-owner/ non-admin denied |
| Admin sets tenant user | admin_id → tenant_user_id | 200 | Admin within tenant succeeds |
| Cross-tenant attempt | admin_a → user_b (different tenant) | 403 | Tenant mismatch denied |
| Duplicate in tenant | existing_handle, same_handle | 409 | Per-tenant uniqueness enforced |
| Invalid format (uppercase) | `Foo-Bar` | 400 | Regex mismatch |
| Invalid length (2 chars) | `ab` | 400 | <MIN length |
| Invalid length (21 chars) | `abcdefghijklmnopqrstu` | 400 | >MAX length |
| Invalid (spaces) | `foo bar` | 400 | Whitespace blocked |
| Reserved name | `admin` | 400 | Reserved match

## Documented Choices

- **(a) Reserved name response code:** **400** — reserved names (`admin`, `office`, `system`, `support`, `root`, `api`, `redhouse`, and variants) return **400 Bad Request** error.
- **(b) Idempotent set behavior:** Choose **200** on repeated set with same value (documented choice); this returns the updated profile state without conflict error.
| Target does not exist | nonexistent_id | 404 | Profile lookup miss |
| Idempotent set | same_handle as current | 200 | Idempotent per documented choice (b) above |

## Contract Provenance (binding)

- Generator: ASSISTANT (row-28a set_handle EF implementation)
- Governed by: **docs/governance/MASTER-TODO-V2.md row 28a** (RATIFIED)
- Update trigger: DEFECT-003 filing required for any deviation
- Next owner: QA (test execution), then Security countersignature, then Cece ratification
- Artefacts produced: Edge Function source, test suite references in EF-RPC-INVENTORY.md, board state sync to PLAN-STATE.md + MASTER-TODO-V2.md

## Contract References

- Existing EF pattern: rows 23/29/28b (method gating, validation before side effects, CORS with OPTIONS→200, clear error codes)
- Existing handle system: migration 062 (profiles.handle + handle_changes audit, per-tenant uniqueness, universal CHECK (3-20, no whitespace))
- RLS (unrelated): profiles.handle table RLS via migration 052-053 (previously needed, now redundant with EF authority)
