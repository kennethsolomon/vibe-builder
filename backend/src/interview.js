import { resolveNiche } from "./niches.js";

/**
 * Deterministic requirements interview. The frontend renders one question at a
 * time; answers are collected into an `answers` object that gates generation.
 *
 * Each question: { id, prompt, type, options?, optional }
 *  - type "choice" -> options[]; "text" -> free text; "url" -> reference links
 *
 * @param {string} niche
 * @returns {{ niche: string, label: string, questions: Array<object> }}
 */
export function buildInterview(niche) {
  const { brief } = resolveNiche(niche);
  const paletteOptions = brief.palettes.map(
    (p) => `${p.name} (${p.colors.join(" / ")})`,
  );

  return {
    niche,
    label: brief.label,
    questions: [
      {
        id: "logo",
        prompt: "Do you have a logo, or should I use a clean text wordmark?",
        type: "choice",
        options: ["Use a placeholder text wordmark", "I'll upload a logo"],
        optional: false,
      },
      {
        id: "palette",
        prompt: `Pick a color scheme for your ${brief.label.toLowerCase()} site (or describe your own):`,
        type: "choice",
        options: [...paletteOptions, "Surprise me (you choose)"],
        optional: false,
      },
      {
        id: "pages",
        prompt: "Which pages or sections do you need? (e.g. Home, Rooms, About, Contact)",
        type: "text",
        optional: true,
      },
      {
        id: "tone",
        prompt: "What tone/vibe should it have? (e.g. luxurious, playful, minimal, cozy)",
        type: "text",
        optional: true,
      },
      {
        id: "references",
        prompt: "Paste any reference/inspiration URLs (optional — I'll match the feel, not copy):",
        type: "url",
        optional: true,
      },
    ],
  };
}
