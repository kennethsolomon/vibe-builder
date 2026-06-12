import { useRef, useState } from "react";
import { uploadLogo, api } from "../api.js";

const HEX_RE = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";

/**
 * Guided multi-question interview. Walks through interview.questions one at a
 * time, collecting answers, then calls onComplete(answers) to gate generation.
 *
 * The `palette` step gains a "custom colors" mode: native color-picker swatches
 * + a comma-separated text field. When the user supplies a custom palette it is
 * passed through as `answers.customPalette` (an array of hex strings); the
 * backend validates and injects it verbatim as the authoritative color system.
 */
export default function Interview({ interview, projectId, onComplete }) {
  const questions = interview?.questions ?? [];
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [swatches, setSwatches] = useState(["#1a1a2e", "#c9a227", "#f5f1e8"]);
  const [paletteText, setPaletteText] = useState("");
  const [logoMode, setLogoMode] = useState(false); // logo step: showing the upload UI
  const [logoPreview, setLogoPreview] = useState(null); // preview URL after upload
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const q = questions[step];
  if (!q) return null;

  const total = questions.length;

  function advance(next) {
    setAnswers(next);
    setDraft("");
    setCustomMode(false);
    setLogoMode(false);
    if (step + 1 >= total) {
      onComplete(next);
    } else {
      setStep(step + 1);
    }
  }

  async function handleLogoFile(file) {
    if (!file || !projectId) return;
    setLogoError("");
    setLogoBusy(true);
    try {
      const { previewUrl } = await uploadLogo(projectId, file);
      // Cache-bust so a Replace re-render shows the new image (same logical URL).
      setLogoPreview(`${previewUrl}?t=${Date.now()}`);
    } catch (err) {
      setLogoError(err.message);
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoError("");
    setLogoBusy(true);
    try {
      if (projectId) await api.deleteLogo(projectId);
      setLogoPreview(null);
    } catch (err) {
      setLogoError(err.message);
    } finally {
      setLogoBusy(false);
    }
  }

  function commit(value) {
    advance({ ...answers, [q.id]: value });
  }

  function skip() {
    commit("");
  }

  function customPaletteList() {
    const fromText = paletteText
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const all = [...swatches, ...fromText].filter((c) => HEX_RE.test(c));
    // de-dupe, normalize leading #
    return [...new Set(all.map((c) => (c.startsWith("#") ? c.toLowerCase() : `#${c.toLowerCase()}`)))];
  }

  function commitCustomPalette() {
    const palette = customPaletteList();
    if (palette.length === 0) return;
    advance({
      ...answers,
      palette: `Custom: ${palette.join(", ")}`,
      customPalette: palette,
    });
  }

  const isPaletteStep = q.id === "palette";
  const isLogoStep = q.id === "logo";
  const UPLOAD_OPTION = "I'll upload a logo";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>
          Question {step + 1} of {total}
        </span>
        <div className="flex-1 h-1 bg-edge rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <p className="text-zinc-100">{q.prompt}</p>

      {q.type === "choice" && !customMode && !logoMode && (
        <div className="space-y-2">
          {q.options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                if (isLogoStep && opt === UPLOAD_OPTION) setLogoMode(true);
                else commit(opt);
              }}
              className="w-full text-left rounded-lg border border-edge bg-panel hover:border-accent/60 px-3.5 py-2.5 text-sm transition"
            >
              {opt}
            </button>
          ))}
          {isPaletteStep && (
            <button
              onClick={() => setCustomMode(true)}
              className="w-full text-left rounded-lg border border-accent/40 bg-accent/5 hover:bg-accent/10 px-3.5 py-2.5 text-sm transition text-accent"
            >
              🎨 Use my own colors…
            </button>
          )}
        </div>
      )}

      {isPaletteStep && customMode && (
        <div className="space-y-3 rounded-lg border border-edge bg-panel p-3">
          <div className="text-xs text-zinc-400">Pick swatches or paste hex codes.</div>
          <div className="flex flex-wrap gap-2">
            {swatches.map((c, i) => (
              <input
                key={i}
                type="color"
                value={c}
                onChange={(e) => {
                  const next = [...swatches];
                  next[i] = e.target.value;
                  setSwatches(next);
                }}
                className="h-9 w-9 rounded cursor-pointer bg-transparent border border-edge"
                title={c}
              />
            ))}
            <button
              type="button"
              onClick={() => setSwatches([...swatches, "#3b82f6"])}
              className="h-9 w-9 rounded border border-dashed border-edge text-zinc-400 hover:text-zinc-200"
              title="Add swatch"
            >
              +
            </button>
          </div>
          <input
            value={paletteText}
            onChange={(e) => setPaletteText(e.target.value)}
            placeholder="or paste: #1a1a2e, #c9a227, #f5f1e8"
            className="w-full rounded-lg bg-ink border border-edge px-3.5 py-2.5 text-sm font-mono outline-none focus:border-accent transition"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={commitCustomPalette}
              disabled={customPaletteList().length === 0}
              className="rounded-lg bg-accent text-ink text-sm font-medium px-4 py-2 disabled:opacity-40 hover:brightness-110 transition"
            >
              Use these colors →
            </button>
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              className="rounded-lg border border-edge text-sm text-zinc-400 px-4 py-2 hover:text-zinc-200 transition"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {isLogoStep && logoMode && (
        <div className="space-y-3 rounded-lg border border-edge bg-panel p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={LOGO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleLogoFile(f);
              e.target.value = ""; // allow re-selecting the same file
            }}
          />

          {!logoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleLogoFile(f);
              }}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center cursor-pointer transition ${
                dragOver ? "border-accent bg-accent/10" : "border-edge hover:border-accent/60"
              }`}
            >
              <span className="text-sm text-zinc-300">
                {logoBusy ? "Uploading…" : "Drop a logo here or click to choose"}
              </span>
              <span className="text-xs text-zinc-500">PNG, JPG, or WebP — up to 5MB</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 rounded-lg border border-edge bg-ink flex items-center justify-center overflow-hidden">
                <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoBusy}
                  className="rounded-lg border border-edge text-sm text-zinc-300 px-3 py-1.5 hover:text-zinc-100 hover:border-accent/60 transition disabled:opacity-40"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={removeLogo}
                  disabled={logoBusy}
                  className="rounded-lg border border-edge text-sm text-zinc-400 px-3 py-1.5 hover:text-zinc-200 transition disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {logoError && <div className="text-xs text-red-400">{logoError}</div>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => commit("uploaded")}
              disabled={logoBusy || !logoPreview}
              className="rounded-lg bg-accent text-ink text-sm font-medium px-4 py-2 disabled:opacity-40 hover:brightness-110 transition"
            >
              Use this logo →
            </button>
            <button
              type="button"
              onClick={() => {
                setLogoMode(false);
                setLogoError("");
              }}
              className="rounded-lg border border-edge text-sm text-zinc-400 px-4 py-2 hover:text-zinc-200 transition"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {(q.type === "text" || q.type === "url") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commit(draft.trim());
          }}
          className="space-y-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={q.type === "url" ? "https://…" : "Type your answer"}
            className="w-full rounded-lg bg-panel border border-edge px-3.5 py-2.5 text-sm outline-none focus:border-accent transition"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-accent text-ink text-sm font-medium px-4 py-2 hover:brightness-110 transition"
            >
              Next →
            </button>
            {q.optional && (
              <button
                type="button"
                onClick={skip}
                className="rounded-lg border border-edge text-sm text-zinc-400 px-4 py-2 hover:text-zinc-200 transition"
              >
                Skip
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
