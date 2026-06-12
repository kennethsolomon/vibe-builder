/**
 * Right-pane panel for full-stack app generations. A full-stack app is not
 * statically previewable in an iframe, so instead of faking a broken preview we
 * SURFACE the local run instructions + URL the user copy-pastes to run it.
 */
export default function AppRunInfo({ runInfo, busy }) {
  return (
    <section className="flex-1 min-w-0 flex flex-col bg-ink">
      <header className="px-4 py-2.5 border-b border-edge flex items-center gap-3">
        <span className="text-xs font-mono text-zinc-500">production app</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {!runInfo ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm text-center">
            {busy
              ? "Building your application… (plan → build → review)"
              : "Run instructions will appear here once the app is generated."}
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">{runInfo.stack}</h3>
              {runInfo.external ? (
                <span className="inline-block mt-1 text-[11px] uppercase tracking-wide text-amber-400 border border-amber-400/40 rounded px-1.5 py-0.5">
                  Uses an external service
                </span>
              ) : (
                <span className="inline-block mt-1 text-[11px] uppercase tracking-wide text-emerald-400 border border-emerald-400/40 rounded px-1.5 py-0.5">
                  Fully local
                </span>
              )}
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Generated into</p>
              <code className="block text-xs font-mono text-zinc-300 bg-panel border border-edge rounded-lg px-3 py-2 break-all">
                {runInfo.dir}
              </code>
            </div>

            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Run it locally</p>
              <div className="bg-black/50 border border-edge rounded-lg p-3 font-mono text-xs space-y-1.5">
                {runInfo.steps.map((s, i) => (
                  <div key={i} className="text-zinc-200">
                    <span className="text-zinc-600 select-none">$ </span>
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {runInfo.localUrl && (
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">Then open</p>
                <a
                  href={runInfo.localUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent font-mono hover:underline"
                >
                  {runInfo.localUrl} ↗
                </a>
              </div>
            )}

            {runInfo.note && (
              <p className="text-xs text-zinc-500 border-l-2 border-edge pl-3">{runInfo.note}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
