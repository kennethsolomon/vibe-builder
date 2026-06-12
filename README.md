# Vibe Builder

A locally-hosted, single-user "vibe-coding" web builder — describe a website in
plain language ("I want a website for a hotel"), answer a few tailoring
questions, and the app generates a complete, niche-appropriate site with a live
preview and chat-based iteration.

**Cost: zero external API spend.** The generation engine is your *local* Claude
Code CLI running in headless mode with your **subscription OAuth** auth — no API
key is used or stored anywhere.

---

## Prerequisites

1. **Node.js 20+** (built/tested on Node 24).
2. **Claude Code CLI** installed and on your `PATH`, and logged in:
   ```bash
   claude login
   ```
   The app uses your subscription token from the keychain. It explicitly
   **strips `ANTHROPIC_API_KEY`** from the spawned child's environment so it can
   never silently fall back to paid API billing.

## Installation (fresh machine)

Requirements:

- **Node.js 20+** (built/tested on Node 24) and the bundled `npm`.
- **Claude Code CLI** installed and on your `PATH`, logged in with an **active
  subscription** (`claude login`). Generation runs through your subscription
  OAuth token — there is no API key to configure.

Set it up:

```bash
# 1. Clone
git clone git@github.com:kennethsolomon/vibe-builder.git
cd vibe-builder

# 2. Install dependencies (root + backend + frontend)
npm run install:all
#   equivalently:
#     npm install
#     npm --prefix backend install
#     npm --prefix frontend install

# 3. Run (installs deps on first launch if you skipped step 2)
./start.sh
```

Then open **http://127.0.0.1:5317** in your browser.

`start.sh` checks that the `claude` CLI is on your `PATH`, installs any missing
`node_modules`, and launches the backend (Fastify, port `4317`) and frontend
(Vite, port `5317`) together via `npm run dev`.

### Troubleshooting

- **`ERROR: the 'claude' CLI is not on PATH`** — install Claude Code and ensure
  `claude` is callable in your shell. Confirm with `claude --version`.
- **Generation fails immediately / auth errors** — you're not logged in (or the
  subscription lapsed). Run `claude login` and verify with `claude` in a
  terminal, then retry.
- **Port already in use (`EADDRINUSE` on 4317 or 5317)** — another process holds
  the port. Free it (e.g. `lsof -ti:5317 | xargs kill`) or override the backend
  port with `PORT=4400 ./start.sh` (set `BACKEND_URL` to match for the Vite
  proxy — see [Configuration](#configuration)).
- **`better-sqlite3` build errors on `npm install`** — you need a Node version
  with a matching prebuilt binary (Node 20+). Re-run `npm --prefix backend
  install` after switching Node versions.

## Quick start

```bash
./start.sh
```

This installs dependencies on first run, then launches both processes:

- Backend (Fastify): http://127.0.0.1:4317
- Frontend (Vite):   http://127.0.0.1:5317  ← open this

Or manually:

```bash
npm run install:all   # one-time
npm run dev           # backend + frontend together
```

## How to use

1. Open http://127.0.0.1:5317.
2. **Describe** what you want ("A website for a beach resort"), pick a
   **project type** (Static website / Production-ready app) and a model
   (Sonnet / Opus / Haiku), and start.
3. **Answer the interview** — logo (or placeholder wordmark), color scheme,
   pages, tone, and any reference URLs. The interview *gates* generation.
4. **Static** sites: watch the **live activity log** as Claude writes files,
   then the **preview iframe** refreshes. **Production apps**: after the
   interview you get a **stack recommendation** to confirm/override, then the
   right pane shows the **local run instructions** (a full-stack app can't be
   previewed in an iframe — see "Project types" below).
5. **Iterate** via chat ("make the hero bigger", "add a contact section"). Each
   iteration resumes the same Claude session.
6. Past projects live in the left sidebar — reopen any of them to keep editing.

Generated output is written to `generated/<slug>/`. Static sites are served
read-only at `/preview/<slug>/`.

## Project types (v2)

When creating a project you choose its type up front (it changes the prompt,
tool scope, and preview handling, so it can't be a mid-interview choice):

### Static website (default)
Marketing / brochure / landing pages. Lightweight anti-AI-slop niche-design
prompt, single self-contained `index.html`, live iframe preview. (v1 behavior.)

### Production-ready app
Full-stack apps with a real DB and (if needed) auth. Two additions:

- **Stack recommendation, not a blind picker.** After the interview a
  deterministic backend heuristic analyzes your requirements and *recommends* a
  stack with reasoning + overridable alternatives:
  - **Laravel (Herd) + SQLite** — the local-first, zero-external-cost default,
    weighted heavily for CRUD / auth / admin apps.
  - **Next.js + Supabase** — offered as an alternative, **flagged as an external
    service** (free tier fine, but called out). Recommended when requirements
    lean realtime / heavily-interactive.
  You confirm or override; the chosen stack is stored and injected into the
  generation prompt.
- **ShipKit-powered generation.** Production-app generations inject ShipKit's
  **plan → build → review** discipline into the child prompt: the child writes a
  brief `tasks/todo.md` plan in the generated app, builds in small verified
  increments, writes tests where sensible, and runs a self security + code
  review pass before finishing. (Static mode stays lightweight — no ShipKit
  overhead.) The model selector passes through in both modes.
- **Preview handling.** A full-stack app isn't statically previewable, so the
  right pane **surfaces the local run commands + URL** (e.g.
  `composer install` → `php artisan migrate` → `php artisan serve` → open
  `http://127.0.0.1:8000`) rather than faking a broken iframe. Auto-starting a
  dev server was deliberately *not* done — a mis-fired auto-start that
  leaks/zombies a process is worse than a clear, copy-pasteable instruction
  block for a single-user local tool.

## Custom color palettes (v2)

The interview's color step now offers a **"Use my own colors…"** mode alongside
the suggested niche palettes: native color-picker swatches **and** a
comma-separated hex text field. Custom hex is **validated server-side** (each
entry must match `^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$`, max 12 colors; anything
else is rejected with a 400) and then injected **verbatim** into the generation
prompt as a `MANDATORY COLOR SYSTEM` block that overrides the niche palette.

## Architecture

```
vibe-builder/
├── start.sh                  # installs deps + runs both processes
├── package.json              # root: concurrently runs backend + frontend
├── backend/                  # Node + Fastify
│   └── src/
│       ├── server.js         # routes: projects CRUD, SSE /generate, /preview static
│       ├── claude-runner.js  # spawns `claude` headless, parses stream-json, scoping
│       ├── prompt.js         # anti-AI-slop system prompt + niche brief injection
│       ├── niches.js         # niche -> design brief map (hotel, cafe, resort, …)
│       ├── interview.js      # deterministic requirements-interview script
│       ├── validate.js       # slug sanitization, model/string validation (boundaries)
│       ├── db.js             # better-sqlite3 project metadata store
│       └── config.js         # paths, port, allowed models, timeout
├── frontend/                 # React + Vite + Tailwind (dark theme)
│   └── src/
│       ├── App.jsx           # layout + project state
│       ├── api.js            # REST client + SSE stream parser (POST + body)
│       ├── streamFormat.js   # claude stream-json -> readable activity lines
│       └── components/       # Sidebar, NewProject, Interview, Workspace, Preview
└── generated/<slug>/         # generated sites (git-ignored)
```

**Flow:** Frontend → `POST /api/projects` (creates record + returns interview) →
interview answers → `POST /api/projects/:id/generate` (Server-Sent Events).
The backend builds a prompt (anti-slop directive + niche brief + answers),
spawns the `claude` CLI in the project dir, streams each `stream-json` event to
the browser as SSE, captures the `session_id`, and flips the project to `ready`.
Iterations re-run with `--resume <session_id>`.

## Security / permission model

The user's prompt is untrusted input that drives a spawned CLI. Safeguards:

- **No shell string interpolation.** The prompt is passed as a discrete `argv`
  element via `child_process.spawn(args[])` — never concatenated into a shell
  command. No `shell: true`. Injection is structurally impossible.
- **Filesystem scoping.** The only user-derived string that touches a path is
  the project **slug**, sanitized to `[a-z0-9-]` (`toSlug`) and hard-re-validated
  (`assertSafeSlug`) before use. The resolved dir is asserted to stay under
  `generated/`. The `../../etc/passwd; rm -rf /` test resolves to the harmless
  slug `etc-passwd-rm-rf`.
- **Tool scoping.** The spawned Claude runs with
  `--permission-mode acceptEdits`, an allow-list and a deny-list, scoped to the
  single project dir via `--add-dir .` with `cwd` set to that dir.
  **`--dangerously-skip-permissions` is never used.**
  - *Static mode* allow-list: `Edit`, `Write`, `Read`, `Glob`, `Grep`,
    `mkdir`/`ls`/`cat`/`find`/`pwd`. Deny: `rm`, `git`, `curl`, `npm`, `node`,
    `WebFetch`, `WebSearch`.
  - *Production-app mode* needs to scaffold a real framework, so it gets a
    **wider but still scoped** allow-list (adds `composer`, `php`/`php artisan`,
    `npm`/`npx`/`node`, `cp`/`mv`/`touch`/`chmod`/`sqlite3`). The
    destructive/exfil denies are **preserved**: `rm`, `git`, `curl`, `wget`,
    `WebFetch`, `WebSearch` remain blocked, and the child still runs cwd-scoped
    under `generated/<slug>/`.
- **Subscription-only auth.** `ANTHROPIC_API_KEY` is deleted from the child
  env, forcing keychain OAuth. No key is read, written, or logged.
- **Process safety.** Non-zero exit surfaces captured stderr; a configurable
  timeout (default 15 min) SIGKILLs runaway generations.
- **Local + single-user by design.** No auth system, no multi-tenancy, no deploy
  infra. Bind host is `127.0.0.1`.

## Configuration

Environment variables (all optional):

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `4317` | Backend port |
| `HOST` | `127.0.0.1` | Backend bind address |
| `GENERATION_TIMEOUT_MS` | `900000` | Kill a generation after this long |
| `BACKEND_URL` | `http://127.0.0.1:4317` | Vite proxy target (frontend dev) |

## Known limitations

- Logo *upload* is acknowledged in the interview but the binary-upload endpoint
  is not yet wired — choosing "I'll upload a logo" currently falls back to a text
  wordmark. Placeholder-wordmark path is fully functional.
- Generation quality depends on the chosen model; Haiku is fast but less
  polished than Sonnet/Opus. **Production-app mode on Haiku** can run out of
  turns while scaffolding a full framework (e.g. `composer create-project`):
  it will reliably produce the `tasks/todo.md` plan + start scaffolding, but a
  full app build is more reliable on Sonnet/Opus.
- Concurrency: a second generation on the **same** project while one is in
  flight is now rejected with **HTTP 409** (in-memory per-project lock).
  Different projects can still generate in parallel.
```
