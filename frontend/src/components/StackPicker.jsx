import { useState } from "react";

/**
 * Presents the backend's stack RECOMMENDATION (not a blind picker): the
 * recommended stack is preselected with its reasoning, and alternatives are
 * listed with a one-line tradeoff + an "(external service)" flag where relevant.
 * The user can override before generation.
 */
export default function StackPicker({ recommendation, onChoose }) {
  const [selected, setSelected] = useState(recommendation.recommended);

  const options = [
    {
      stack: recommendation.recommended,
      label: recommendation.label,
      reason: recommendation.reasoning,
      external: false,
      recommended: true,
    },
    ...recommendation.alternatives.map((a) => ({
      stack: a.stack,
      label: a.label,
      reason: a.tradeoff,
      external: a.external,
      recommended: false,
    })),
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-zinc-100 font-medium">Recommended stack</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          Based on your requirements. You can override before building.
        </p>
      </div>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.stack}
            onClick={() => setSelected(opt.stack)}
            className={`w-full text-left rounded-lg border px-3.5 py-2.5 transition ${
              selected === opt.stack
                ? "border-accent bg-accent/10"
                : "border-edge bg-panel hover:border-accent/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{opt.label}</span>
              {opt.recommended && (
                <span className="text-[10px] uppercase tracking-wide text-accent border border-accent/40 rounded px-1.5 py-0.5">
                  Recommended
                </span>
              )}
              {opt.external && (
                <span className="text-[10px] uppercase tracking-wide text-amber-400 border border-amber-400/40 rounded px-1.5 py-0.5">
                  External service
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">{opt.reason}</p>
          </button>
        ))}
      </div>

      <button
        onClick={() => onChoose(selected)}
        className="rounded-lg bg-accent text-ink text-sm font-medium px-4 py-2 hover:brightness-110 transition"
      >
        Build with this stack →
      </button>
    </div>
  );
}
