const STATUS_COLOR = {
  interviewing: "text-amber-400",
  generating: "text-accent",
  ready: "text-emerald-400",
  error: "text-red-400",
};

export default function Sidebar({ projects, activeId, onSelect, onNew }) {
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
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`w-full text-left rounded-lg px-3 py-2 text-sm transition border ${
              activeId === p.id
                ? "bg-edge/60 border-edge"
                : "border-transparent hover:bg-edge/30"
            }`}
          >
            <div className="truncate font-medium">{p.name}</div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[11px] text-zinc-500 truncate">{p.niche}</span>
              <span className={`text-[10px] ${STATUS_COLOR[p.status] ?? "text-zinc-500"}`}>
                {p.status}
              </span>
            </div>
          </button>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-edge text-[11px] text-zinc-600">
        Engine: local Claude Code CLI
      </div>
    </aside>
  );
}
