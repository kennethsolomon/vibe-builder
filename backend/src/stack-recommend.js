/**
 * Deterministic stack recommendation for production-ready app generations.
 *
 * No Claude call — a pure heuristic over the collected requirements. The system
 * RECOMMENDS a stack (with reasoning + overridable alternatives) rather than
 * just asking the user to pick blind.
 *
 * Bias (intentional, per project owner's context):
 * - LOCAL-FIRST, zero-external-cost is the default goal.
 * - Laravel (Herd) + SQLite is the preferred default for CRUD/auth/admin apps —
 *   the owner is a Laravel dev who runs Herd locally. Weighted heavily.
 * - Next.js + Supabase is offered as an alternative but Supabase is FLAGGED as
 *   an external service (free tier fine, but called out).
 *
 * @typedef {{ stack: string, label: string, tradeoff: string, external: boolean }} StackOption
 * @typedef {{ recommended: string, label: string, reasoning: string, alternatives: StackOption[] }} Recommendation
 */

const LARAVEL = {
  stack: "laravel-sqlite",
  label: "Laravel (Herd) + SQLite",
  external: false,
};
const NEXT = {
  stack: "nextjs-supabase",
  label: "Next.js + Supabase",
  external: true,
};

/**
 * Build a recommendation from requirements. Static-site projects get no stack.
 *
 * @param {{ project_type?: string, niche?: string, brief?: string }} project
 * @param {{ pages?: string, tone?: string, features?: string }} [answers]
 * @returns {Recommendation|null}
 */
export function recommendStack(project, answers = {}) {
  if (project?.project_type !== "app") return null;

  const haystack = [project.niche, project.brief, answers.pages, answers.tone, answers.features]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Signals that nudge toward Next.js (heavy-interactive / realtime / edge).
  const nextSignals = [
    "realtime",
    "real-time",
    "websocket",
    "live chat",
    "collaborative",
    "react native",
    "mobile app",
    "edge",
    "serverless",
    "vercel",
    "next.js",
    "nextjs",
  ];
  const matchesNext = nextSignals.some((s) => haystack.includes(s));

  // CRUD/auth/admin signals reinforce the Laravel default.
  const crudSignals = ["crud", "admin", "dashboard", "auth", "login", "users", "database", "form", "blog", "inventory", "booking"];
  const matchesCrud = crudSignals.some((s) => haystack.includes(s));

  if (matchesNext && !matchesCrud) {
    return {
      recommended: NEXT.stack,
      label: NEXT.label,
      reasoning:
        "Your requirements lean toward realtime / heavily-interactive client behavior, where Next.js + Supabase fits well. Note Supabase is an external service (free tier is fine, but it's not fully local).",
      alternatives: [
        {
          ...LARAVEL,
          tradeoff:
            "Fully local, zero external service. Realtime is more work, but simpler for CRUD/auth.",
        },
      ],
    };
  }

  // Default: Laravel + SQLite (local-first, zero external cost).
  const reasoning = matchesCrud
    ? "Simple CRUD + auth → Laravel + SQLite is simpler than Next.js + Supabase here; fully local, no external service, and matches your Herd setup."
    : "Local-first default: Laravel + SQLite runs entirely on your machine under Herd with zero external cost. Best fit for most CRUD/auth/admin apps.";

  return {
    recommended: LARAVEL.stack,
    label: LARAVEL.label,
    reasoning,
    alternatives: [
      {
        ...NEXT,
        tradeoff:
          "Great for realtime / React-heavy UIs. Supabase is an external service (free tier acceptable).",
      },
    ],
  };
}
