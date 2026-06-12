import { useState } from "react";
import { api } from "../api.js";

const MODELS = [
  { value: "sonnet", label: "Sonnet — balanced (recommended)" },
  { value: "opus", label: "Opus — highest quality" },
  { value: "haiku", label: "Haiku — fastest / cheapest" },
];

const EXAMPLES = [
  "A website for a boutique hotel",
  "A landing page for a beach resort",
  "A cozy neighborhood cafe site",
  "A personal portfolio for a developer",
];

export default function NewProject({ onCreated, onError }) {
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [model, setModel] = useState("sonnet");
  // Project type is chosen HERE (not the interview): it changes the entire
  // downstream flow — tool scope, prompt shape, and whether a stack
  // recommendation step appears — so it must be set before the interview starts.
  const [projectType, setProjectType] = useState("static");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const niche = name.replace(/^(a |an |the )/i, "").replace(/website|site|landing page|app|for/gi, "").trim() || name;
      const result = await api.createProject({
        name: name.trim(),
        niche,
        brief: brief.trim(),
        model,
        project_type: projectType,
      });
      onCreated(result);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold tracking-tight">Describe your website</h2>
        <p className="text-zinc-400 mt-2">
          Tell me what you want in plain language. I'll ask a few questions, then build it.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">What do you want to build?</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A website for a hotel"
              className="w-full rounded-lg bg-panel border border-edge px-3.5 py-3 outline-none focus:border-accent transition"
            />
            <div className="flex flex-wrap gap-2 mt-2.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setName(ex)}
                  className="text-xs text-zinc-400 border border-edge rounded-full px-3 py-1 hover:border-accent/50 hover:text-zinc-200 transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Any extra detail? <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              placeholder="It's a beachfront resort in Palawan, family-friendly, needs a booking section…"
              className="w-full rounded-lg bg-panel border border-edge px-3.5 py-3 outline-none focus:border-accent transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Project type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "static", title: "Static website", desc: "Marketing / brochure / landing. Live iframe preview." },
                { value: "app", title: "Production-ready app", desc: "Full-stack, real DB, auth. I'll recommend a stack." },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setProjectType(t.value)}
                  className={`text-left rounded-lg border px-3.5 py-3 transition ${
                    projectType === t.value
                      ? "border-accent bg-accent/10"
                      : "border-edge bg-panel hover:border-accent/40"
                  }`}
                >
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg bg-panel border border-edge px-3.5 py-3 outline-none focus:border-accent transition"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-lg bg-accent text-ink font-semibold px-5 py-3 disabled:opacity-40 hover:brightness-110 transition"
          >
            {busy ? "Creating…" : "Start interview →"}
          </button>
        </form>
      </div>
    </div>
  );
}
