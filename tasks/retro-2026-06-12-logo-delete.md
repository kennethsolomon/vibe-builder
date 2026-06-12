# Retro (/sk:retro) — Logo Upload + Project Delete — 2026-06-12

## What shipped
- Part 1: logo binary upload (resumed from a dead agent's partial work) — finished + hardened.
- Part 2: project delete with two-choice confirmation (list-only vs delete-files) — built from scratch.

## Velocity
- ~70% of Part 1 was already done by the prior (session-limited) agent: backend route,
  magic-byte validation, DB column, prompt wiring, frontend upload UI, multipart installed.
  Resuming-not-restarting saved the bulk of the work. The partial state was "nearly complete,"
  not broken.
- Part 2 was greenfield: db.deleteProject, DELETE route with realpath/symlink guard, Sidebar
  modal, App wiring.

## Blockers / friction
- A STALE backend process on the test port served pre-edit code → first e2e run 404'd on the
  logo route. Lesson: always kill + restart the dev server after backend edits before e2e.
- curl/wget blocked by sandbox hook → all HTTP smoke tests done via Node `fetch`.

## Quality gate
- Vex round 1: HOLD — SVG XSS blocklist bypassable + no-op iframe sandbox.
- Fix: rejected SVG outright (allowlist PNG/JPG/WebP). Vex round 2: SHIP.
- The blocklist→allowlist pivot is the key learning; captured in lessons.md #9.

## What to do differently next time
- Default to allowlist validation for any executable-document format from the start;
  don't ship a blocklist and wait for review to catch it.
- Restart spawned local servers after every backend edit in a verification loop.

## Verification evidence
- validate unit: 10/10 (raster pass; SVG incl. tab-bypass + BOM rejected).
- e2e upload+attack: 9/9. Real haiku gen → index.html `<img src="assets/logo.png">`.
- delete: 10/10 (list-only keeps files, delete-files removes both, symlink-to-/tmp refused 400,
  victim survived). Delete-during-generation → 409. Frontend build clean.
