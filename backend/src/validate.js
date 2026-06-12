import { ALLOWED_MODELS, DEFAULT_MODEL } from "./config.js";

/**
 * Convert an arbitrary project name into a filesystem-safe slug.
 * Output is restricted to [a-z0-9-]; this is the ONLY string that is ever
 * joined into a generated-project filesystem path.
 *
 * @param {unknown} name
 * @returns {string} a non-empty slug
 */
export function toSlug(name) {
  const base = typeof name === "string" ? name : "";
  const slug = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? slug : `site-${Date.now().toString(36)}`;
}

/**
 * Hard re-validation of a slug before it touches the filesystem.
 * Throws on anything outside the safe charset (defence in depth — toSlug
 * already guarantees this, but callers may pass stored values).
 *
 * @param {unknown} slug
 * @returns {string}
 */
export function assertSafeSlug(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new ValidationError(`Unsafe project slug: ${String(slug)}`);
  }
  return slug;
}

/**
 * @param {unknown} model
 * @returns {"opus"|"sonnet"|"haiku"}
 */
export function normalizeModel(model) {
  if (typeof model === "string" && ALLOWED_MODELS.includes(model)) {
    return model;
  }
  return DEFAULT_MODEL;
}

/**
 * @param {unknown} value
 * @param {string} field
 * @param {{ max?: number, min?: number }} [opts]
 * @returns {string}
 */
export function requireString(value, field, opts = {}) {
  const { max = 8000, min = 1 } = opts;
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new ValidationError(`${field} is required`);
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${field} exceeds ${max} characters`);
  }
  return trimmed;
}

const HEX_RE = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

/**
 * Validate + normalize a user-supplied color palette.
 * Accepts an array of strings OR a comma/space-separated string.
 * Each entry must be a 3- or 6-digit hex (with or without leading #).
 * Returns a normalized array of `#rrggbb` (lowercase). Throws on any invalid
 * entry. This is the ONLY user color data that flows into the generation prompt,
 * so it is hard-validated here at the boundary before it can reach the prompt.
 *
 * @param {unknown} input
 * @returns {string[]}
 */
export function validateHexPalette(input) {
  let raw;
  if (Array.isArray(input)) {
    raw = input;
  } else if (typeof input === "string") {
    raw = input.split(/[,\s]+/);
  } else {
    throw new ValidationError("custom_palette must be an array or comma-separated string");
  }

  const entries = raw.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  if (entries.length === 0) {
    throw new ValidationError("custom_palette is empty");
  }
  if (entries.length > 12) {
    throw new ValidationError("custom_palette accepts at most 12 colors");
  }

  return entries.map((entry) => {
    if (!HEX_RE.test(entry)) {
      throw new ValidationError(`Invalid hex color: ${entry}`);
    }
    let hex = entry.replace(/^#/, "").toLowerCase();
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    return `#${hex}`;
  });
}

/**
 * @param {unknown} value
 * @returns {"static"|"app"}
 */
export function normalizeProjectType(value) {
  return value === "app" ? "app" : "static";
}

const ALLOWED_STACKS = Object.freeze([
  "laravel-sqlite",
  "nextjs-supabase",
  "static-html",
]);

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeStack(value) {
  if (typeof value === "string" && ALLOWED_STACKS.includes(value)) return value;
  return null;
}

/** Hard cap on uploaded logo size (also enforced by multipart limits). */
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Validate an uploaded logo by its ACTUAL bytes (magic-byte sniffing), not the
 * client-declared mimetype or extension — both are attacker-controlled.
 *
 * SVG is REJECTED outright. An SVG is an executable document: served as a
 * top-level page (or embedded as anything other than `<img>`) it runs scripts
 * in the preview origin. A finite regex blocklist cannot reliably catch every
 * vector (`<\tscript>`, namespaced event attrs, `<use href="data:">`, CSS
 * `@import`, …), so the only safe stance for a raster-logo use case is to not
 * accept the format at all. PNG/JPG/WebP cover real logos.
 *
 * This is the ONLY path by which a user-supplied binary is persisted into a
 * generated project dir, so the type decision is made here at the boundary.
 *
 * @param {Buffer} buffer  the full file bytes
 * @returns {{ ext: "png"|"jpg"|"webp", mime: string }}
 */
export function validateLogoUpload(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ValidationError("Empty upload");
  }
  if (buffer.length > LOGO_MAX_BYTES) {
    throw new ValidationError("Logo exceeds 5MB limit");
  }

  // PNG: 89 50 4E 47
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  // WebP: bytes 0-3 "RIFF" (52 49 46 46) and bytes 8-11 "WEBP" (57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }

  // SVG is an executable document, not a safe raster image — reject it with a
  // clear message rather than letting a forged extension fall through.
  let head = buffer.toString("utf8", 0, 256);
  if (head.charCodeAt(0) === 0xfeff) head = head.slice(1); // strip UTF-8 BOM
  head = head.replace(/^\s+/, "").toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    throw new ValidationError("SVG logos are not supported — use PNG, JPG, or WebP");
  }

  throw new ValidationError("Unsupported file type — only PNG, JPG, WebP are allowed");
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}
