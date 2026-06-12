import { useState } from "react";

const STATUS_COLOR = {
  interviewing: "text-amber-400",
  generating: "text-accent",
  ready: "text-emerald-400",
  error: "text-red-400",
};

export default function Sidebar({ projects, activeId, onSelect, onNew, onDelete }) {
  // The project pending deletion (shows the confirm modal), or null.
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function doDelete(deleteFiles) {
    if (!confirm) return;
    setBusy(true);
    setError("");
    try {
      await onDelete(confirm.id, deleteFiles);
      setConfirm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="w-64 shrink-0 bg-panel border-r border-edge flex flex-col">
      <div className="px-4 py-4 border-b border-edge">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px] shadow-accent" />
          <h1 className="font-semibold tracking-tight">Vibe Builder</h1>
        </div>
        <p className="text-xs text-zinc-500 mt-1">local · subscription auth</p>
      </div>

      <button
        onClick={onNew}
        className="mx-3 mt-3 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent text-sm font-medium py-2 transition"
      >
        + New site
      </button>

      <div className="mt-4 px-3 text-[11px] uppercase tracking-wider text-zinc-600">
        Projects
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {projects.length === 0 && (
          <p className="text-xs text-zinc-600 px-2 py-4">No projects yet.</p>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            className={`group relative w-full rounded-lg text-sm transition border ${
              activeId === p.id
                ? "bg-edge/60 border-edge"
                : "border-transparent hover:bg-edge/30"
            }`}
          >
            <button
              onClick={() => onSelect(p.id)}
              className="w-full text-left px-3 py-2 pr-9"
            >
              <div className="truncate font-medium">{p.name}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[11px] text-zinc-500 truncate">{p.niche}</span>
                <span className={`text-[10px] ${STATUS_COLOR[p.status] ?? "text-zinc-500"}`}>
                  {p.status}
                </span>
              </div>
            </button>
            <button
              type="button"
              title="Delete project"
              aria-label={`Delete ${p.name}`}
              onClick={() => {
                setError("");
                setConfirm(p);
              }}
              className="absolute right-1.5 top-1.5 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-edge text-[11px] text-zinc-600">
        Engine: local Claude Code CLI
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => !busy && setConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-edge bg-panel p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-zinc-100">Delete project</h2>
            <p className="mt-1 text-sm text-zinc-400">
              <span className="text-zinc-200">{confirm.name}</span> — choose how far to delete.
            </p>

            {error && <div className="mt-3 text-xs text-red-400">{error}</div>}

            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => doDelete(false)}
                className="w-full rounded-lg border border-edge bg-ink/40 px-3.5 py-2.5 text-left text-sm hover:border-accent/60 transition disabled:opacity-40"
              >
                <div className="font-medium text-zinc-100">Remove from list only</div>
                <div className="text-[11px] text-zinc-500">
                  Deletes the project record. Keeps the generated files on disk.
                </div>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => doDelete(true)}
                className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-left text-sm hover:bg-red-500/20 hover:border-red-500/60 transition disabled:opacity-40"
              >
                <div className="font-medium text-red-300">Delete files too</div>
                <div className="text-[11px] text-red-400/70">
                  Deletes the record AND the generated folder, including uploaded logos. Cannot be undone.
                </div>
              </button>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm(null)}
              className="mt-3 w-full rounded-lg px-3.5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
