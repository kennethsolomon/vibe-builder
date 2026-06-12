# Lessons (/sk:learn) — Vibe Builder

Reusable instincts extracted from the v2 build. Obey these on future work.

1. Headless `claude -p` children do NOT auto-invoke /sk: slash commands. To get
   ShipKit discipline inside a spawned generation, INJECT the plan->build->review
   instructions as prompt scaffolding, don't expect slash-command invocation.

2. When widening a spawned child's tool allow-list for a new mode, keep a SEPARATE
   deny-list and re-assert the destructive/exfil denies (rm/git/curl/wget/WebFetch/
   WebSearch). Never widen the deny side. cwd-scope + --add-dir . must remain.

3. Any new user-derived content in a spawned-CLI prompt must flow through the SAME
   discrete-argv path and be validated at the boundary first. Hex colors: strict
   regex, normalize, cap count — reject (400), never sanitize-and-pass.

4. For local single-user tools, prefer SURFACING run instructions over auto-starting
   dev servers when the failure mode of auto-start (zombie/leaked process) is worse
   than a copy-paste block.

5. Add DB columns with idempotent PRAGMA table_info guards + ALTER, so v1 DBs upgrade
   without a destructive rebuild.

6. curl/wget are blocked in this environment's sandbox hook — use Node `fetch` for
   HTTP smoke tests against a locally-spawned server.

7. Background `node server.js` started via plain Bash with `&` does not persist
   (shell cwd resets between calls). Use run_in_background:true for long-lived
   local servers and read the output file.
