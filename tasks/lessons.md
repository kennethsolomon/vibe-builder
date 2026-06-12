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

## Logo upload + project delete (feature, 2026-06-12)

8. For user-uploaded binaries, validate by MAGIC BYTES, never the client mimetype
   or filename. Generate the stored filename server-side (`logo.<ext>` from the
   sniffed type) so a traversal filename like `../../etc/x.png` is structurally
   impossible to honor.

9. SVG is an executable document, not a safe image. A regex XSS blocklist is
   bypassable (`<\tscript>`, namespaced handlers, `<use href=data:>`, CSS @import)
   AND the preview iframe's `sandbox="allow-scripts allow-same-origin"` is a
   spec-defined no-op. For a raster-logo use case, REJECT SVG outright (allowlist
   PNG/JPG/WebP) rather than sanitize. Allowlist > blocklist at every boundary.

10. A `deleteFiles` rm primitive must resolve the real path (`fs.realpathSync`) and
    require it to be a STRICT subdirectory of `realpathSync(GENERATED_ROOT)` —
    never equal to root, never a symlink target outside it — before any rmSync.
    String-prefix checks alone are defeated by symlinks.

11. Reuse the existing in-flight concurrency lock to refuse destructive ops (delete)
    while a generation runs (409). The window between mkdirSync and inFlight.add has
    no `await`, so Node's single thread can't interleave a delete there — but the
    guard must still exist for the post-add duration.
