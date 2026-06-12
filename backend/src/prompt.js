import { resolveNiche } from "./niches.js";

/**
 * Shared anti-AI-slop design directive prepended to every generation.
 */
const SLOP_GUARD = `
You are a senior product designer + front-end engineer building a REAL, distinctive website.

NON-NEGOTIABLE DESIGN RULES:
- DO NOT produce a generic purple-gradient SaaS template. No "#7c3aed -> #db2777" hero gradients.
- DO NOT fill the page with lorem ipsum. Write real, specific, niche-appropriate copy.
- Use a DISTINCT typography pairing (load fonts from Google Fonts via <link>). Headings and body must differ deliberately.
- Create real layout variety across sections — vary rhythm, alignment, and density. Avoid identical stacked centered cards.
- Use free, no-API-key placeholder imagery ONLY:
  - https://picsum.photos/seed/<word>/<w>/<h> for photos (vary the seed word per image so images differ)
  - https://source.unsplash.com/<w>x<h>/?<keyword> as an alternative
- Make it responsive (mobile-first), accessible (semantic HTML, alt text, sufficient contrast), and self-contained.
- Prefer a single index.html with a styles.css (and a small script.js only if needed). Plain HTML/CSS/JS — no build step, no npm install. It must open directly in a browser.
`.trim();

/**
 * Build the initial generation prompt for a brand-new site.
 *
 * @param {object} project
 * @param {{ logo?: string, palette?: string, references?: string, pages?: string, tone?: string }} answers
 * @returns {string}
 */
/**
 * Build a "MANDATORY COLOR SYSTEM" block from a validated custom palette.
 * The hexes are already normalized + validated upstream (validate.js); they are
 * injected VERBATIM and override the niche palette.
 *
 * @param {string[]|null|undefined} palette
 * @returns {string|null}
 */
function customPaletteBlock(palette) {
  if (!Array.isArray(palette) || palette.length === 0) return null;
  return [
    "## MANDATORY COLOR SYSTEM (overrides any niche/suggested palette)",
    `Use these EXACT hex values as the authoritative color system. Do NOT substitute, tint, or invent other brand colors:`,
    palette.join(", "),
    "Build the entire visual system (backgrounds, surfaces, text, accents, CTAs) from these colors. You may derive opacity/shade variants, but the base hexes above are fixed.",
  ].join("\n");
}

/**
 * Parse the stored custom_palette (JSON text) back into an array.
 * @param {unknown} raw
 * @returns {string[]|null}
 */
function parsePalette(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * ShipKit plan -> build -> review discipline injected into production-app gens.
 * A headless `-p` child will not auto-invoke /sk: slash commands, so we inject
 * the equivalent discipline as prompt scaffolding (the reliable approach).
 */
function shipkitDiscipline(stackInstructions) {
  return [
    "## BUILD DISCIPLINE (production app — follow ShipKit plan → build → review)",
    "You are building a REAL, production-ready application — not a throwaway prototype. Follow this discipline:",
    "1. PLAN: First write a brief plan to `tasks/todo.md` in this directory (Goal, a short ordered task list, and acceptance criteria). Create the `tasks/` dir if needed.",
    "2. BUILD in small, verified increments: scaffold the project, then add one model/feature at a time. After each meaningful step, verify it (run the app's check/test command where sensible).",
    "3. Write tests where they add value (at least one test for the core model/route).",
    "4. SELF-REVIEW before finishing: do a security + code-review pass over what you wrote (no secrets committed, input validated, no obvious injection, sensible error handling). Note the result in `tasks/todo.md`.",
    "5. Follow the chosen stack's idioms and conventions exactly.",
    "",
    "### Stack",
    stackInstructions,
  ].join("\n");
}

const STACK_INSTRUCTIONS = {
  "laravel-sqlite": [
    "Target: Laravel + SQLite (fully local, runs under Laravel Herd).",
    "- Scaffold a standard Laravel app structure in THIS directory.",
    "- Use SQLite (`database/database.sqlite`, `DB_CONNECTION=sqlite` in .env) — no external DB.",
    "- Use migrations for schema, Eloquent models, resource controllers, and Blade (or Livewire) views.",
    "- If auth is needed, use Laravel's built-in auth scaffolding conventions.",
    "- Provide a README section with `php artisan migrate` and `php artisan serve` (or Herd URL) run steps.",
  ].join("\n"),
  "nextjs-supabase": [
    "Target: Next.js (App Router) + Supabase. NOTE: Supabase is an EXTERNAL service.",
    "- Scaffold a Next.js app in THIS directory (app/ router, TypeScript).",
    "- Use the Supabase JS client; read keys from `.env.local` (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). Do NOT hardcode keys — leave placeholders and document them.",
    "- Define the data model and provide SQL for the Supabase tables in a `supabase/schema.sql`.",
    "- Provide a README section with `npm install` + `npm run dev` and the env vars to set.",
  ].join("\n"),
};

/**
 * Build the initial generation prompt for a brand-new site.
 *
 * @param {object} project
 * @param {{ logo?: string, palette?: string, references?: string, pages?: string, tone?: string, features?: string }} answers
 * @returns {string}
 */
export function buildGenerationPrompt(project, answers = {}) {
  if (project.project_type === "app") {
    return buildAppGenerationPrompt(project, answers);
  }
  return buildStaticGenerationPrompt(project, answers);
}

/**
 * Static-site mode — lightweight anti-AI-slop niche-design prompt (v1 behavior),
 * plus optional custom-palette override.
 */
function buildStaticGenerationPrompt(project, answers = {}) {
  const { brief: nb } = resolveNiche(project.niche);
  const customPalette = parsePalette(project.custom_palette);
  const lines = [];

  lines.push(SLOP_GUARD);
  lines.push("");
  lines.push(`## Project`);
  lines.push(`Name: ${project.name}`);
  lines.push(`Niche: ${project.niche || nb.label}`);
  lines.push(`User request: ${project.brief || project.name}`);
  lines.push("");
  lines.push(`## Niche design brief (${nb.label})`);
  lines.push(`- Vibe: ${nb.vibe}`);
  lines.push(`- Typography: ${nb.typography}`);
  lines.push(`- Suggested palette hexes: ${nb.palette.join(", ")}`);
  lines.push(`- Expected sections / layout: ${nb.layout}`);
  lines.push(`- Imagery direction: ${nb.imagery}`);

  const paletteBlock = customPaletteBlock(customPalette);
  if (paletteBlock) {
    lines.push("");
    lines.push(paletteBlock);
  }

  if (answers.tone) lines.push(`- Requested tone/vibe override: ${answers.tone}`);
  if (answers.palette && !paletteBlock) lines.push(`- Requested color scheme: ${answers.palette}`);
  if (answers.pages) lines.push(`- Pages/sections needed: ${answers.pages}`);
  if (answers.references) {
    lines.push(`- Reference/inspiration the user pasted (match the FEEL, do not copy): ${answers.references}`);
  }
  if (project.logo_path) {
    lines.push(`- Logo: the user uploaded a logo at "${project.logo_path}". Reference it with <img src="${project.logo_path}" alt="${project.name} logo">. Do NOT invent a wordmark.`);
  } else {
    lines.push(`- Logo: none provided — design a clean text wordmark from the project name.`);
  }

  lines.push("");
  lines.push(`## Output instructions`);
  lines.push(`Write the site files DIRECTLY into the current working directory using the Write tool.`);
  lines.push(`Always include an index.html at the root. Keep everything self-contained and openable in a browser with no build step.`);
  lines.push(`When done, briefly summarize the files you created and the design choices you made.`);

  return lines.join("\n");
}

/**
 * Production-app mode — ShipKit discipline + chosen stack + anti-slop design.
 */
function buildAppGenerationPrompt(project, answers = {}) {
  const { brief: nb } = resolveNiche(project.niche);
  const customPalette = parsePalette(project.custom_palette);
  const stack = project.stack && STACK_INSTRUCTIONS[project.stack] ? project.stack : "laravel-sqlite";
  const lines = [];

  lines.push(SLOP_GUARD);
  lines.push("");
  lines.push(shipkitDiscipline(STACK_INSTRUCTIONS[stack]));
  lines.push("");
  lines.push(`## Project`);
  lines.push(`Name: ${project.name}`);
  lines.push(`Niche: ${project.niche || nb.label}`);
  lines.push(`User request: ${project.brief || project.name}`);
  lines.push(`This is a PRODUCTION-READY APPLICATION (not a static brochure site).`);
  lines.push("");
  lines.push(`## Design direction (${nb.label})`);
  lines.push(`- Vibe: ${nb.vibe}`);
  lines.push(`- Typography: ${nb.typography}`);

  const paletteBlock = customPaletteBlock(customPalette);
  if (paletteBlock) {
    lines.push("");
    lines.push(paletteBlock);
  } else {
    lines.push(`- Suggested palette hexes: ${nb.palette.join(", ")}`);
  }

  if (answers.tone) lines.push(`- Requested tone/vibe override: ${answers.tone}`);
  if (answers.pages) lines.push(`- Pages/screens/features needed: ${answers.pages}`);
  if (answers.features) lines.push(`- Functional requirements: ${answers.features}`);
  if (answers.references) {
    lines.push(`- Reference/inspiration (match the FEEL, do not copy): ${answers.references}`);
  }
  if (project.logo_path) {
    lines.push(`- Logo: the user uploaded a logo at "${project.logo_path}" (relative to this directory). Reference it as <img src="${project.logo_path}" alt="${project.name} logo"> and copy/move "${project.logo_path}" into the app's public/static asset directory as the stack requires (e.g. Laravel public/, Next.js public/). Do NOT invent a wordmark.`);
  } else {
    lines.push(`- Logo: none provided — design a clean text wordmark from the project name.`);
  }

  lines.push("");
  lines.push(`## Output instructions`);
  lines.push(`Scaffold and build the application DIRECTLY in the current working directory.`);
  lines.push(`Keep the anti-slop design mandate: distinct typography, real copy, no generic purple-gradient SaaS look.`);
  lines.push(`When done, summarize: files created, how to run it locally, and the result of your self-review pass.`);

  return lines.join("\n");
}

/**
 * Build an iteration prompt for an existing site (resumed session).
 * @param {string} instruction
 * @returns {string}
 */
export function buildIterationPrompt(instruction) {
  return [
    "Continue editing the website in the current working directory based on this request:",
    "",
    instruction,
    "",
    "Keep the same anti-slop standards: distinct typography, real copy, no purple-gradient SaaS look, free no-key placeholder images.",
    "Edit the existing files in place. Always keep index.html valid and openable in a browser.",
    "When done, summarize what you changed.",
  ].join("\n");
}
