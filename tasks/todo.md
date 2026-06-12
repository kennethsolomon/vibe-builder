# Vibe Builder v2 — Plan

## Goal
Add three enhancements to the working v1 without regressing any v1 security invariant:
1. **Custom color palette** — user supplies own hex (swatches + comma text), validated server-side, injected VERBATIM as a MANDATORY COLOR SYSTEM block that overrides the niche palette.
2. **Production-ready app mode + stack RECOMMENDATION** — project-type choice (static vs full-stack app). System analyzes requirements with a deterministic heuristic and RECOMMENDS a stack (Laravel+SQLite default, Next.js+Supabase alternative flagged as external). User can override. Chosen stack injected into prompt. Preview handling for full-stack: surface local URL + run instructions (don't fake a broken iframe).
3. **ShipKit-powered generation for production apps** — inject plan→build→review discipline into the child prompt for app mode; static mode stays lightweight. Model passthrough preserved in both modes.

Plus cheap open item: **concurrent-generation guard** (per-project in-memory lock → 409).

## v1 invariants to preserve (Vex will test)
- Prompt as discrete argv element, no shell:true, no interpolation.
- Slug `[a-z0-9-]`, path-escape blocked; dev-server spawn uses sanitized slug + fixed cwd under generated/<slug>/.
- ANTHROPIC_API_KEY stripped from child env.
- Scoped perms; no --dangerously-skip-permissions; bind 127.0.0.1.
- Preview route blocks traversal.
- Custom hex validated server-side: each `^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$`, reject/sanitize else.

## Plan (small, verified increments)

### Backend
- [ ] `validate.js`: add `validateHexPalette(input)` → accepts array or comma-string, normalizes each to `#rrggbb`, rejects invalid, caps count (e.g. 12). Add `normalizeProjectType(v)` → "static"|"app".
- [ ] `db.js`: add columns `project_type TEXT DEFAULT 'static'`, `custom_palette TEXT` (JSON array), `stack TEXT` via idempotent ALTER (migration guard). Update insert/update statements.
- [ ] `stack-recommend.js` (new): deterministic heuristic. Input = answers + brief + project_type. Output = { recommended, reasoning, alternatives:[{stack, tradeoff, external}] }. Laravel+SQLite weighted as default for CRUD/auth/admin; Next.js+Supabase alternative flagged external; static-site type → no stack.
- [ ] `prompt.js`:
  - Inject MANDATORY COLOR SYSTEM block when custom_palette present (verbatim, overrides niche palette).
  - When project_type=app: build app-mode prompt with chosen stack + ShipKit plan→build→review discipline scaffold (write tasks/todo.md in generated app, small verified increments, self-run security+code-review pass, follow stack conventions). Keep anti-slop design mandate.
  - Static mode unchanged (lightweight).
- [ ] `claude-runner.js`: app mode needs broader tools (Bash for artisan/composer/npm scaffolding). Add an `appMode` flag → wider but still scoped allow-list; keep deny-list for destructive/exfil where safe. Keep argv-element prompt, key strip, no skip-permissions.
- [ ] `server.js`:
  - Accept project_type, custom_palette, stack on create + generate; validate.
  - New route `POST /api/projects/:id/recommend-stack` (or fold recommendation into create response) returning recommendation.
  - Concurrency guard: in-memory `Map` keyed by project id; if in-flight → 409. Release in finally.
  - For app mode after gen: detect app, surface local run URL + instructions in `done` event (decision: surface, not auto-start — documented).
  - Dev-server spawn (if any) uses sanitized slug + fixed cwd.

### Frontend
- [ ] `NewProject.jsx`: add project-type toggle (Static website / Production-ready app) with one-line explainer. Document why here vs interview.
- [ ] `Interview.jsx`: add custom-palette step UI — swatch inputs (native color picker) + comma text field, in addition to suggested palettes. Add stack-recommendation step for app mode (show recommendation + reasoning + alternatives radio).
- [ ] `api.js`: thread project_type/custom_palette/stack; add recommend call if separate route.
- [ ] `Workspace.jsx` / `Preview.jsx`: for app mode show surfaced local URL + run instructions panel instead of (or alongside) iframe.

### Docs
- [ ] Update `README.md`: new modes, custom palette, stack recommendation, preview handling, concurrency guard.

## Verification
- [ ] Unit-style assert: custom hex `#aabbcc,#123` (3-digit) normalize; reject `red`, `#zzz`, `'; rm -rf /`.
- [ ] Assert assembled prompt contains MANDATORY COLOR SYSTEM with exact hexes.
- [ ] Stack recommender produces Laravel+SQLite for a CRUD/auth brief; Next+Supabase flagged external.
- [ ] REAL headless gen in app mode (`--model haiku`): tiny Laravel/Next task-list. Confirm generates into generated/<slug>/, ShipKit artifact (tasks/todo.md) appears, session_id captured, no ANTHROPIC_API_KEY.
- [ ] Static regression: a static gen still works, model passthrough preserved.
- [ ] Concurrency: second concurrent gen → 409.
- [ ] `npm run build` clean (frontend).

## Acceptance Criteria
- All three features functional + validated server-side.
- Zero v1 invariant regressions (re-verified).
- Real app-mode gen evidence captured (session_id, paths, artifacts).
- Frontend builds clean.
- README updated.
- /sk:learn + /sk:retro artifacts written to tasks/.
