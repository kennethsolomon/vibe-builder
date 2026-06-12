# Progress — Vibe Builder v2

## 2026-06-12

- [x] validate.js: `validateHexPalette`, `normalizeProjectType`, `normalizeStack` — verified via 11 unit asserts.
- [x] db.js: added `project_type`/`custom_palette`/`stack` columns + idempotent ALTER migration. insert/update statements updated.
- [x] stack-recommend.js: deterministic heuristic. Verified: CRUD/auth brief → laravel-sqlite; realtime brief → nextjs-supabase (flagged external); static → null.
- [x] prompt.js: split into static vs app prompt builders. Custom-palette MANDATORY COLOR SYSTEM block (verbatim, overrides niche). App prompt injects ShipKit plan→build→review discipline + per-stack instructions. Verified hexes + discipline present in assembled prompt.
- [x] claude-runner.js: `appMode` flag → wider APP_ALLOWED_TOOLS (composer/php/artisan/npm/node/sqlite3) but APP_DISALLOWED_TOOLS keeps rm/git/curl/wget/WebFetch/WebSearch. Prompt still discrete argv; key strip preserved; no skip-permissions.
- [x] server.js: project_type on create; `/recommend-stack` route; custom_palette validated + persisted on first gen; stack persisted; in-memory concurrency lock → 409, released in finally; app-mode surfaces runInfo (no iframe).
- [x] Frontend: NewProject project-type toggle; Interview custom-palette UI (swatches + comma text); StackPicker (recommendation, not blind picker); AppRunInfo (surfaced run instructions); Workspace branches static vs app; api.recommendStack. `npm run build` clean.
- [x] README updated: project types, custom palettes, stack recommendation, preview handling, app-mode tool scope, 409 concurrency.

## Verification (all real, not faked)
- [x] 19 backend unit asserts pass (hex/type/stack/palette-injection/recommendation/app-prompt).
- [x] REAL app-mode gen (haiku): session_id 9f333654-…; child wrote tasks/todo.md plan with Goal/Tasks/Acceptance Criteria + self-review security item; custom palette #0b3c89/#ff6128 carried into plan verbatim; output only inside generated/e2e-task-app/; ANTHROPIC_API_KEY absent.
- [x] Concurrency: 2nd concurrent gen → 409.
- [x] Static regression (haiku): index.html written, previewUrl /preview/<slug>/ returned, model passthrough confirmed.
- [x] Bad hex (red, #zzz) on generate → 400.
- [x] 12/12 security invariants re-verified in source.
- [x] frontend npm run build clean.
