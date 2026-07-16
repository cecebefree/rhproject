# R-036 — v0 Quarantine Breach Remediation & Ignore-Parity Doctrine

Sealed by operator ruling R-036 PHASE 2 (2026-07-16). Gate conduct: the
secret-scan pattern matched 11 files in Phase 1; the operator reviewed the
verbatim evidence and ruled FALSE POSITIVE the same day — no live credentials,
no history rewrite. Remediation proceeds index-only.

## Breach
82 files from `v0-cecebefree-3976-58ac388e/` were tracked on `main`. The
directory is a v0 scratch/sketchpad and must never enter the rhproject
history as tracked content.

## Cause
A single add-all sweep in commit **`d09fab8`** ("Add mobile scaffold and v0
import", 2026-06-30). Of the commit's 118 files, **82 were scratch-dir
cargo** pulled in alongside the mobile scaffold. One `git add -A` / `git add .`
event — not a slow leak over time.

## Why it went unnoticed — IGNORE-PARITY doctrine (new)
`biome.json` already listed `v0-cecebefree-*/**` in `files.ignore`, so Biome
was silent about the directory. But **`.gitignore` had no `v0` pattern**. The
tooling ignore masked the git breach: every lint/CI pass was clean, so no one
saw 82 scratch files sitting in the index.

**New doctrine — IGNORE-PARITY:** any path quarantined from tooling
(Biome, tsc, ESLint, CI guards) MUST have a matching `.gitignore` entry.
Whenever a tooling ignore is added, also add the corresponding `.gitignore`
rule and prove it with `git check-ignore -v <sample-path>`. Text in
`.gitignore` is not evidence — behavioral `check-ignore` is.

## Secret scan (Phase 1)
A broad pattern `(api[_-]?key|secret|password|service_role|SUPABASE_.*KEY|Bearer )`
matched 11 files. Every match was verified as prose / placeholder / var-name:
- `.env.example`: `VITE_BREVO_API_KEY=` with **empty value** (template).
- Policy docs (`constitution.md`, `AGENTS.md`, `best-practices.md`,
  `tech-stack.md`): name `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
  `BREVO_API_KEY` as env vars with **no assigned values**, describing policy
  ("never committed", "git-ignored").
- `spec*.md` / `plan.md` / `quickstart.md` / `research.md`: "password" in
  user-story / FR prose.
- `speckit-implement/SKILL.md`: lists `*.secret.yaml`, `secrets/` as ignore
  patterns.
- **No** `Bearer ` token, no `KEY=value` with a real value.

Operator ruled FALSE POSITIVE 2026-07-16; history retained unmodified.

## Gate conduct (required pattern)
On the secret-scan match, the agent STOPPED and escalated with verbatim
evidence rather than self-authorizing the remediation. This is the mandated
behavior: a match on a "stop and escalate" gate is never auto-cleared by the
agent. The operator's explicit FALSE POSITIVE ruling is what authorized
Phase 2.

## Remediation (this commit)
- `git rm --cached -r v0-cecebefree-3976-58ac388e/` — **index-only**; the
  working tree is preserved untouched (verified: files still listed on disk).
- `.gitignore`: appended `v0-cecebefree-*/` (line 34). Behavioral proof:
  `git check-ignore -v 'v0-cecebefree-3976-58ac388e/AGENTS.md'` →
  `.gitignore:34:v0-cecebefree-*/`. The dir no longer appears as untracked.
- Forensic note sealed (this doc).

## Standing doctrine reaffirmed
v0 is a quarantined, credit-gated sketchpad with **no write access to
rhproject main**. It must never be tracked; tooling ignores are insufficient
on their own (IGNORE-PARITY). Any future v0-style directory needs a
`.gitignore` entry at creation time.
