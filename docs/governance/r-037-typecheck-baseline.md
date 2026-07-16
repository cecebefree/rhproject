# R-037 — Typecheck Baseline & tsconfig Authoring

Sealed by operator ruling R-037 PHASE 2 (2026-07-17). This is a
**MEASUREMENT round** — configs authored, baseline recorded, nothing fixed.

## Configs authored

### `tsconfig.base.json` (repo root)
Neutral baseline shared by `packages/shared` and `apps/web`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

### `packages/shared/tsconfig.json`
```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```
`src` = `database.types.ts` (generated, drift-guarded, never hand-edited)
+ `index.ts` (one line re-exporting `Database`). `vitest.config.ts`
deliberately OUTSIDE the surface — it is a test-runner config, not part
of the published types; ruled out of scope for typecheck.

### `apps/web/tsconfig.json`
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022", "DOM", "DOM.Iterable"] },
  "include": ["src"]
}
```
Web adds DOM libs (browser target). Plus one explicit stub
`apps/web/src/main.ts`:
```ts
// R-037 placeholder scaffold — replace when web is instantiated.
export {};
```
**Stub rationale:** without any source file, `tsc --noEmit` with
`include: ["src"]` would fail with **TS18003 "No inputs were found"**
— a misleading red that masks the real state. A one-line stub makes the
web project compile to a clean green (0 errors) instead of erroring on
emptiness. This is the fail-loud doctrine applied correctly: the project
is genuinely empty, so we make that explicit with a real (if trivial)
compilable file rather than letting tsc report a spurious "no inputs"
diagnostic. The stub is clearly marked for replacement when web is built.

## Mobile isolation
`apps/mobile/tsconfig.json` was left UNTOUCHED. It extends
`expo/tsconfig.base` and uses React-Native/Expo-specific options
(`jsx: react-jsx`, `allowImportingTsExtensions`, `module: preserve`) —
deliberately isolated from the new base. Verified: the new root
`tsconfig.base.json` did not change mobile's resolution (mobile
typecheck = 0 errors, exit 0).

## skipLibCheck — ruled baseline choice
`skipLibCheck: true` is set in the base. Ruled as a baseline choice:
vendor `.d.ts` noise (e.g. mismatched lib definitions in third-party
packages) is not our debt and should not block our typecheck. Recorded
as **revisitable** — if a real type error is hidden behind skipLibCheck
later, this is the first knob to revisit.

## Baseline of record
| Package | Errors | Notes |
|---|---|---|
| `@redhouse/shared` | **0** | 2 source files (`database.types.ts` + `index.ts`); clean. |
| `@rhproject/web` | **0** | over 1 stub file (`src/main.ts`); clean. |
| `@redhouse/mobile` | **0** (out of scope) | isolated; recorded for context only, not part of this round's baseline mandate. |

**First true type-error baseline established: shared 0, web 0.**
This is the meaningful milestone — typecheck was previously
*unmeasurable* in both packages (no tsconfig, `tsc --noEmit` dumped
`--help` and exited 1). With configs in place, both now report 0 real
TS errors. `database.types.ts` was included in the compile and produced
no errors; it remains untouched.

## Deferred
- **TypeScript version pinning:** declared ranges are floating
  (`^5.7.0` root/web, `^5.6.3` shared) but the resolved/locked version
  is **5.9.3**. No version change made this round (ruling: no version
  changes). If exact pinning is desired later, it is a separate ruled
  change.
- **Web framework instantiation:** web is still a placeholder shell
  (no vite.config, no entry HTML). The stub is a stopgap; real tsconfig
  tuning (jsx, bundler specifics) follows when the framework lands.
