import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/src -> backend -> project root
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
export const GENERATED_ROOT = path.join(PROJECT_ROOT, "generated");
export const DB_PATH = path.join(PROJECT_ROOT, "backend", "vibe-builder.db");

export const PORT = Number(process.env.PORT ?? 4317);
export const HOST = process.env.HOST ?? "127.0.0.1";

// Models exposed in the UI dropdown -> passed verbatim to `claude --model`.
export const ALLOWED_MODELS = Object.freeze(["opus", "sonnet", "haiku"]);
export const DEFAULT_MODEL = "sonnet";

// Generation guard rails.
export const GENERATION_TIMEOUT_MS = Number(
  process.env.GENERATION_TIMEOUT_MS ?? 15 * 60 * 1000,
);
