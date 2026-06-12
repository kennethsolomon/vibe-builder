# Findings — Vibe Builder v2

## ShipKit integration: prompt-injection over real /sk: invocation
A headless `claude -p` child does NOT auto-invoke `/sk:` slash commands, so
relying on it to call `/sk:plan` is unreliable. Chosen approach: inject the
equivalent plan->build->review DISCIPLINE as prompt scaffolding for app-mode
generations. TESTED with --model haiku: the child reliably wrote a real
tasks/todo.md (Goal, ordered tasks, Acceptance Criteria, explicit self-review/
security line). Tradeoff: no separate ShipKit review-packet machinery, but
reliable single--p-run discipline with zero dependency on slash-command
auto-invocation. Static mode skips all of this to stay lightweight.

## Preview handling for full-stack apps: surface, don't auto-start
The iframe assumes a static index.html. For full-stack apps we SURFACE local run
commands + URL (Laravel: composer install -> php artisan migrate -> php artisan
serve -> :8000) instead of auto-starting a dev server. A mis-fired auto-start
that leaks/zombies a process is a worse failure mode than a clear copy-pasteable
instruction block for a single-user local tool. Backend returns previewUrl:null
+ structured runInfo for app projects; frontend renders AppRunInfo.

## App-mode tool scope widening (security-reviewed)
Production-app gens get a wider APP_ALLOWED_TOOLS (composer/artisan/npm/node/
sqlite3) but APP_DISALLOWED_TOOLS PRESERVES rm/git/curl/wget/WebFetch/WebSearch,
and the child stays cwd-scoped under generated/<slug>/ with --add-dir . No new
exfil/destructive path.

## Custom palette flows through the SAME safe argv path
Validated at boundary (strict regex, max 12, normalized to #rrggbb), stored as
JSON, embedded into the prompt STRING still passed as ONE discrete argv element.
No shell interpolation. "#aabbcc; rm -rf /" is rejected at validation (400).

## DB migration
v1 tables get 3 new columns via idempotent PRAGMA-guarded ALTERs; existing DB
upgrades cleanly without data loss.

## Honest limitation
Haiku app-mode can exhaust turns during a full Laravel scaffold (composer
create-project is slow). It reliably produces the plan + begins scaffolding; a
complete app build is more reliable on Sonnet/Opus. Documented in README.
