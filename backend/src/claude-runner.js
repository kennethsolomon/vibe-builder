import { spawn } from "node:child_process";
import { GENERATION_TIMEOUT_MS } from "./config.js";

/**
 * Tools the spawned claude instance is allowed to use. Scoped to writing files
 * inside ONE project directory plus harmless inspection commands.
 */
const ALLOWED_TOOLS = [
  "Edit",
  "Write",
  "Read",
  "Glob",
  "Grep",
  "Bash(mkdir *)",
  "Bash(ls *)",
  "Bash(cat *)",
  "Bash(find *)",
  "Bash(pwd)",
];

const DISALLOWED_TOOLS = [
  "Bash(rm *)",
  "Bash(git *)",
  "Bash(curl *)",
  "Bash(npm *)",
  "Bash(node *)",
  "WebFetch",
  "WebSearch",
];

/**
 * Production-app generations need to scaffold a real framework, so they get a
 * wider — but still scoped — toolset (composer/artisan/php/npm/node for build
 * commands). The exfil/destructive denies (rm, git, curl, WebFetch, WebSearch)
 * are PRESERVED. The child still runs cwd-scoped under generated/<slug>/ with
 * `--add-dir .` and no `--dangerously-skip-permissions`.
 */
const APP_ALLOWED_TOOLS = [
  "Edit",
  "Write",
  "Read",
  "Glob",
  "Grep",
  "Bash(mkdir *)",
  "Bash(ls *)",
  "Bash(cat *)",
  "Bash(find *)",
  "Bash(pwd)",
  "Bash(cp *)",
  "Bash(mv *)",
  "Bash(touch *)",
  "Bash(echo *)",
  "Bash(composer *)",
  "Bash(php *)",
  "Bash(php artisan *)",
  "Bash(npm *)",
  "Bash(npx *)",
  "Bash(node *)",
  "Bash(chmod *)",
  "Bash(sqlite3 *)",
];

const APP_DISALLOWED_TOOLS = [
  "Bash(rm *)",
  "Bash(git *)",
  "Bash(curl *)",
  "Bash(wget *)",
  "WebFetch",
  "WebSearch",
];

/**
 * Build the argv for a claude headless invocation.
 * The prompt is ALWAYS passed as a discrete argv element — never interpolated
 * into a shell string — so user text cannot inject shell or CLI flags.
 *
 * @param {{ prompt: string, model: string, resumeSessionId?: string|null }} opts
 * @returns {string[]}
 */
function buildArgs({ prompt, model, resumeSessionId, appMode = false }) {
  const args = [];
  if (resumeSessionId) {
    args.push("--resume", resumeSessionId);
  }
  args.push("-p", prompt);
  args.push("--output-format", "stream-json", "--verbose");
  args.push("--model", model);
  args.push("--permission-mode", "acceptEdits");
  args.push("--allowedTools", ...(appMode ? APP_ALLOWED_TOOLS : ALLOWED_TOOLS));
  args.push("--disallowedTools", ...(appMode ? APP_DISALLOWED_TOOLS : DISALLOWED_TOOLS));
  args.push("--add-dir", ".");
  return args;
}

/**
 * Spawn claude headless in `cwd`, parse the stream-json line protocol, and
 * forward normalized events to `onEvent`. Resolves with a summary including the
 * captured session_id.
 *
 * Subscription auth: we deliberately do NOT set ANTHROPIC_API_KEY. We also
 * strip it from the child env so a stray shell export can't silently switch to
 * paid API billing.
 *
 * @param {object} params
 * @param {string} params.cwd            absolute path of the generated project dir
 * @param {string} params.prompt         full prompt (already built)
 * @param {string} params.model          opus|sonnet|haiku
 * @param {string|null} [params.resumeSessionId]
 * @param {(event: object) => void} params.onEvent
 * @returns {Promise<{ sessionId: string|null, result: string|null, costUsd: number|null, isError: boolean }>}
 */
export function runClaude({ cwd, prompt, model, resumeSessionId = null, appMode = false, onEvent }) {
  return new Promise((resolve, reject) => {
    const args = buildArgs({ prompt, model, resumeSessionId, appMode });

    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY; // force subscription OAuth, never paid API

    let child;
    try {
      child = spawn("claude", args, {
        cwd,
        env: childEnv,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      reject(new Error(`Failed to spawn claude: ${err.message}`));
      return;
    }

    let sessionId = null;
    let finalResult = null;
    let costUsd = null;
    let isError = false;
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`claude generation timed out after ${GENERATION_TIMEOUT_MS}ms`));
    }, GENERATION_TIMEOUT_MS);

    const handleLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let event;
      try {
        event = JSON.parse(trimmed);
      } catch {
        // Non-JSON noise (e.g. a stray log line). Surface as raw for the UI.
        onEvent({ type: "raw", text: trimmed });
        return;
      }

      if (event.type === "system" && event.subtype === "init" && event.session_id) {
        sessionId = event.session_id;
      }
      if (event.type === "result") {
        if (event.session_id) sessionId = event.session_id;
        if (typeof event.result === "string") finalResult = event.result;
        if (typeof event.total_cost_usd === "number") costUsd = event.total_cost_usd;
        if (event.is_error || event.subtype === "error_max_turns") isError = true;
      }

      onEvent(event);
    };

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      let idx;
      while ((idx = stdoutBuffer.indexOf("\n")) !== -1) {
        const line = stdoutBuffer.slice(0, idx);
        stdoutBuffer = stdoutBuffer.slice(idx + 1);
        handleLine(line);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`claude process error: ${err.message}`));
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      if (stdoutBuffer.trim()) handleLine(stdoutBuffer);

      if (code !== 0) {
        const detail = stderrBuffer.trim() || finalResult || "no stderr captured";
        reject(new Error(`claude exited with code ${code}: ${detail}`));
        return;
      }

      resolve({ sessionId, result: finalResult, costUsd, isError });
    });
  });
}
