# B-008 RESOLUTION PLAN — v0 DESIGN DURABLE EXPORT

Opened: 2026-07-23 at bacfa3f. Blocker: approved design (v0 sandbox
commit af66274) exists ONLY in the v0 browser sandbox. Live preview
link is Vercel-auth gated. Single point of failure until exported.

## Resolution routes (in order of preference)

- ROUTE 1 — v0 Publish (free): open v0 project in browser; Share
  menu -> Publish. If available, produces a public URL. Record URL
  in PLAN-STATE.md and upgrade item 8 PARTIAL -> DONE.
- ROUTE 2 — ZIP export (free): v0 project -> Download ZIP. If it
  succeeds, commit the ZIP contents to a design/ directory in this
  repo (read-only reference, NOT wired — no-wiring state applies).
- ROUTE 3 — Vercel deployment protection off (free): Vercel
  dashboard -> project -> Settings -> Deployment Protection ->
  disable. Makes the existing preview link publicly readable.
- ROUTE 4 — credit top-up (paid): only if routes 1-3 all fail.
  Owner decision; record cost.
- ROUTE 5 — last resort (free): full-page screenshots of every
  screen at af66274, committed to design/screenshots/. Lossy but
  durable.

## Exit criteria

B-008 closes when at least ONE of the following is true and
recorded in PLAN-STATE.md with a commit hash:
- a publicly readable URL is on file, OR
- design source or screenshots are committed to this repo.

## Constraints

- No-wiring state IN FORCE (DF-32 / SB-11 / CF-12 all OPEN):
  exported design is REFERENCE ONLY until gates clear.
- Owner executes all browser/Vercel steps; agent is read/draft only.
