export default function Preview({ url, busy, onRefresh }) {
  return (
    <section className="flex-1 min-w-0 flex flex-col bg-ink">
      <header className="px-4 py-2.5 border-b border-edge flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
          <span className="h-3 w-3 rounded-full bg-zinc-700" />
        </div>
        <div className="flex-1 text-center text-xs font-mono text-zinc-500 truncate">
          {url ? url.split("?")[0] : "preview"}
        </div>
        <button
          onClick={onRefresh}
          disabled={!url}
          className="text-xs text-zinc-400 border border-edge rounded-md px-2.5 py-1 hover:text-zinc-200 disabled:opacity-30 transition"
        >
          Refresh
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent border border-accent/30 rounded-md px-2.5 py-1 hover:bg-accent/10 transition"
          >
            Open ↗
          </a>
        )}
      </header>

      <div className="flex-1 relative bg-white">
        {url ? (
          <iframe
            key={url}
            src={url}
            title="Live preview"
            className="absolute inset-0 w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-ink text-zinc-600 text-sm">
            {busy ? "Generating your site…" : "Your site preview will appear here after generation."}
          </div>
        )}
        {busy && url && (
          <div className="absolute top-3 right-3 bg-black/70 text-accent text-xs px-3 py-1.5 rounded-full border border-accent/30">
            building…
          </div>
        )}
      </div>
    </section>
  );
}
