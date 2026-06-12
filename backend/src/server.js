import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";

import { PORT, HOST, GENERATED_ROOT } from "./config.js";
import {
  insertProject,
  getProject,
  getProjectBySlug,
  listProjects,
  updateProject,
} from "./db.js";
import {
  toSlug,
  assertSafeSlug,
  normalizeModel,
  normalizeProjectType,
  normalizeStack,
  validateHexPalette,
  requireString,
  ValidationError,
} from "./validate.js";
import { buildInterview } from "./interview.js";
import { buildGenerationPrompt, buildIterationPrompt } from "./prompt.js";
import { recommendStack } from "./stack-recommend.js";
import { runClaude } from "./claude-runner.js";

/**
 * Per-project in-flight generation lock. A single-user local tool only needs an
 * in-memory guard to stop two generations racing the same cwd / session_id.
 */
const inFlight = new Set();

fs.mkdirSync(GENERATED_ROOT, { recursive: true });

const app = Fastify({ logger: { level: "info" } });
// Local single-user tool: only the Vite dev origin and same-origin need access.
await app.register(cors, {
  origin: [/^http:\/\/(127\.0\.0\.1|localhost):\d+$/],
});

// ---- Static serving of generated sites for the live-preview iframe ----------
// URL: /preview/<slug>/...  ->  generated/<slug>/...
app.register(fastifyStatic, {
  root: GENERATED_ROOT,
  prefix: "/preview/",
  decorateReply: false,
  index: ["index.html"],
});

/** Resolve + harden the absolute dir for a project slug. */
function projectDir(slug) {
  assertSafeSlug(slug);
  const dir = path.join(GENERATED_ROOT, slug);
  // Defence in depth: ensure the resolved path stays under GENERATED_ROOT.
  if (!dir.startsWith(GENERATED_ROOT + path.sep)) {
    throw new ValidationError("Resolved path escapes generated root");
  }
  return dir;
}

function nowIso() {
  return new Date().toISOString();
}

// ---- Health ------------------------------------------------------------------
app.get("/api/health", async () => ({ ok: true }));

// ---- List projects -----------------------------------------------------------
app.get("/api/projects", async () => {
  return { projects: listProjects() };
});

// ---- Get one project ---------------------------------------------------------
app.get("/api/projects/:id", async (req, reply) => {
  const project = getProject(req.params.id);
  if (!project) return reply.code(404).send({ error: "Project not found" });
  const dir = projectDir(project.slug);
  const hasIndex = fs.existsSync(path.join(dir, "index.html"));
  return { project, hasIndex };
});

// ---- Create project + return interview ---------------------------------------
app.post("/api/projects", async (req, reply) => {
  const name = requireString(req.body?.name, "name", { max: 120 });
  const niche = requireString(req.body?.niche ?? name, "niche", { max: 120 });
  const brief = typeof req.body?.brief === "string" ? req.body.brief.slice(0, 8000) : "";
  const model = normalizeModel(req.body?.model);
  const projectType = normalizeProjectType(req.body?.project_type);

  // Unique slug.
  let slug = toSlug(name);
  if (getProjectBySlug(slug)) slug = `${slug}-${randomUUID().slice(0, 4)}`;
  assertSafeSlug(slug);

  const project = insertProject({
    id: randomUUID(),
    slug,
    name,
    niche,
    brief,
    session_id: null,
    model,
    status: "interviewing",
    project_type: projectType,
    custom_palette: null,
    stack: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  return reply.code(201).send({ project, interview: buildInterview(niche) });
});

// ---- Stack recommendation (production-app mode) ------------------------------
// Body: { answers?: {...} }. Returns null recommendation for static projects.
app.post("/api/projects/:id/recommend-stack", async (req, reply) => {
  const project = getProject(req.params.id);
  if (!project) return reply.code(404).send({ error: "Project not found" });
  const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};
  return { recommendation: recommendStack(project, answers) };
});

// ---- Generate (SSE stream of claude events) ----------------------------------
// Body: { answers: {...} }  for first gen, or { instruction: "..." } for iterate
app.post("/api/projects/:id/generate", async (req, reply) => {
  const project = getProject(req.params.id);
  if (!project) return reply.code(404).send({ error: "Project not found" });

  // Concurrency guard: refuse a second generation racing the same project.
  if (inFlight.has(project.id)) {
    return reply.code(409).send({ error: "A generation is already running for this project" });
  }

  const isIteration = Boolean(project.session_id) && typeof req.body?.instruction === "string";
  const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};

  // Persist custom palette + stack on the first generation (validated here).
  let persisted = project;
  if (!isIteration) {
    const patch = { ...project };
    if (req.body?.custom_palette != null) {
      const palette = validateHexPalette(req.body.custom_palette); // throws on bad hex
      patch.custom_palette = JSON.stringify(palette);
    }
    const stack = normalizeStack(req.body?.stack);
    if (stack) patch.stack = stack;
    if (patch.custom_palette !== project.custom_palette || patch.stack !== project.stack) {
      patch.updated_at = nowIso();
      updateProject(patch);
      persisted = patch;
    }
  }

  const isApp = persisted.project_type === "app";
  const dir = projectDir(persisted.slug);
  fs.mkdirSync(dir, { recursive: true });

  let prompt;
  if (isIteration) {
    const instruction = requireString(req.body.instruction, "instruction", { max: 8000 });
    prompt = buildIterationPrompt(instruction);
  } else {
    prompt = buildGenerationPrompt(persisted, answers);
  }

  inFlight.add(project.id);

  // SSE headers.
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (eventName, data) => {
    reply.raw.write(`event: ${eventName}\n`);
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send("status", { phase: isIteration ? "iterating" : "generating", model: persisted.model });

  updateProject({ ...persisted, status: "generating", updated_at: nowIso() });

  try {
    const summary = await runClaude({
      cwd: dir,
      prompt,
      model: persisted.model,
      resumeSessionId: isIteration ? persisted.session_id : null,
      appMode: isApp,
      onEvent: (event) => send("claude", event),
    });

    const refreshed = getProject(persisted.id);
    updateProject({
      ...refreshed,
      session_id: summary.sessionId ?? refreshed.session_id,
      status: summary.isError ? "error" : "ready",
      updated_at: nowIso(),
    });

    // Full-stack apps are not statically previewable. Surface run instructions
    // instead of faking a broken iframe (decision documented in README/findings).
    const runInfo = isApp ? appRunInfo(persisted, dir) : null;

    send("done", {
      sessionId: summary.sessionId,
      result: summary.result,
      costUsd: summary.costUsd,
      isError: summary.isError,
      slug: persisted.slug,
      projectType: persisted.project_type,
      // Static gets an iframe preview; app gets surfaced run instructions.
      previewUrl: isApp ? null : `/preview/${persisted.slug}/`,
      runInfo,
    });
  } catch (err) {
    const refreshed = getProject(persisted.id);
    if (refreshed) {
      updateProject({ ...refreshed, status: "error", updated_at: nowIso() });
    }
    app.log.error({ err }, "generation failed");
    send("error", { message: err instanceof Error ? err.message : String(err) });
  } finally {
    inFlight.delete(project.id);
    reply.raw.end();
  }
});

/**
 * Build local run instructions for a generated full-stack app. We SURFACE the
 * commands + local URL rather than auto-starting a dev server (decision: a
 * mis-fired auto-start that leaks/zombies a process is worse than a clear,
 * copy-pasteable instruction block for a single-user local tool).
 */
function appRunInfo(project, dir) {
  if (project.stack === "nextjs-supabase") {
    return {
      stack: "Next.js + Supabase",
      external: true,
      dir,
      steps: ["npm install", "cp .env.local.example .env.local  # set Supabase keys", "npm run dev"],
      localUrl: "http://localhost:3000",
      note: "Supabase is an external service — set NEXT_PUBLIC_SUPABASE_URL / ANON_KEY before running.",
    };
  }
  // Default: Laravel + SQLite.
  return {
    stack: "Laravel (Herd) + SQLite",
    external: false,
    dir,
    steps: ["composer install", "php artisan migrate", "php artisan serve"],
    localUrl: "http://127.0.0.1:8000",
    note: "Fully local. Or serve it via Laravel Herd by linking this folder under ~/Herd.",
  };
}

// ---- Error handler -----------------------------------------------------------
app.setErrorHandler((err, _req, reply) => {
  const status = err instanceof ValidationError ? 400 : err.statusCode ?? 500;
  app.log.error({ err }, "request failed");
  reply.code(status).send({ error: err.message ?? "Internal error" });
});

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`vibe-builder backend listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
