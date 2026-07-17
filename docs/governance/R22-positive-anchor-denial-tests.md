R22 — Positive-anchor requirement for denial tests. Every RLS
denial test file must contain at least one positive-visibility
assertion proving the acting role can see or affect its own tenant's
rows. Any lives_ok wrapping an UPDATE or DELETE must be paired with
a row-count or post-state assertion. Rationale: D-013t3 showed
t1/t2/t4 passing vacuously with a broken fixture role.
