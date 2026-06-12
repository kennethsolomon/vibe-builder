import { useState, useRef, useEffect, useCallback } from "react";
import { api, streamGenerate } from "../api.js";
import { formatClaudeEvent } from "../streamFormat.js";
import Interview from "./Interview.jsx";
import StackPicker from "./StackPicker.jsx";
import Preview from "./Preview.jsx";
import AppRunInfo from "./AppRunInfo.jsx";

/**
 * Workspace: drives the interview -> generation -> iteration loop and renders
 * the live preview. `messages` is a unified activity/chat log.
 */
export default function Workspace({ initialProject, initialInterview, onProjectUpdated }) {
  const [project, setProject] = useState(initialProject);
  const [interview] = useState(initialInterview);
  const [phase, setPhase] = useState(
    initialInterview ? "interview" : project.session_id ? "ready" : "idle",
  );
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]); // live claude lines during a run
  const [iterateText, setIterateText] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [pendingAnswers, setPendingAnswers] = useState(null); // app-mode: held until stack chosen
  const [recommendation, setRecommendation] = useState(null);
  const [runInfo, setRunInfo] = useState(null); // app-mode run instructions after gen
  const abortRef = useRef(null);
  const logRef = useRef(null);
  const isApp = project.project_type === "app";

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, activity]);

  const addMessage = useCallback((role, text) => {
    setMessages((m) => [...m, { role, text, id: crypto.randomUUID() }]);
  }, []);

  const runGeneration = useCallback(
    async (payload, label) => {
      setBusy(true);
      setActivity([]);
      addMessage("user", label);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamGenerate(
          project.id,
          payload,
          (eventName, data) => {
            if (eventName === "claude") {
              const line = formatClaudeEvent(data);
              if (line) setActivity((a) => [...a.slice(-60), line]);
            } else if (eventName === "done") {
              setProject((p) => ({ ...p, session_id: data.sessionId ?? p.session_id, status: data.isError ? "error" : "ready" }));
              addMessage(
                "assistant",
                data.isError
                  ? "Generation finished with an error — check the activity log."
                  : data.result || "Done. Preview updated.",
              );
              if (data.runInfo) setRunInfo(data.runInfo);
              setPreviewVersion((v) => v + 1);
              setPhase("ready");
              onProjectUpdated?.();
            } else if (eventName === "error") {
              addMessage("assistant", `Error: ${data.message}`);
              setPhase("ready");
            }
          },
          controller.signal,
        );
      } catch (err) {
        if (err.name !== "AbortError") addMessage("assistant", `Error: ${err.message}`);
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [project.id, addMessage, onProjectUpdated],
  );

  const startGeneration = useCallback(
    (answers, stack) => {
      const { customPalette, ...rest } = answers;
      const payload = { answers: rest };
      if (Array.isArray(customPalette) && customPalette.length) payload.custom_palette = customPalette;
      if (stack) payload.stack = stack;
      const summary = Object.entries(rest)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ");
      const label = isApp
        ? `Build the app (${stack || "default stack"}) — ${summary || "sensible defaults"}`
        : `Generate the site — ${summary || "use sensible defaults"}`;
      setPhase("generating");
      runGeneration(payload, label);
    },
    [runGeneration, isApp],
  );

  const onInterviewComplete = useCallback(
    async (answers) => {
      if (!isApp) {
        startGeneration(answers, null);
        return;
      }
      // App mode: get a stack recommendation before generating.
      setPendingAnswers(answers);
      setPhase("recommend");
      try {
        const { customPalette, ...rest } = answers;
        const { recommendation } = await api.recommendStack(project.id, rest);
        setRecommendation(recommendation);
      } catch (err) {
        addMessage("assistant", `Could not load stack recommendation: ${err.message}. Defaulting to Laravel + SQLite.`);
        startGeneration(answers, "laravel-sqlite");
      }
    },
    [isApp, project.id, startGeneration, addMessage],
  );

  const onStackChosen = useCallback(
    (stack) => {
      setRecommendation(null);
      startGeneration(pendingAnswers ?? {}, stack);
      setPendingAnswers(null);
    },
    [pendingAnswers, startGeneration],
  );

  const onIterate = useCallback(
    (e) => {
      e.preventDefault();
      const text = iterateText.trim();
      if (!text || busy) return;
      setIterateText("");
      runGeneration({ instruction: text }, text);
    },
    [iterateText, busy, runGeneration],
  );

  const previewUrl = project.session_id || project.status === "ready"
    ? `/preview/${project.slug}/?v=${previewVersion}`
    : null;

  return (
    <div className="flex-1 min-h-0 flex">
      {/* Left: chat / interview / activity */}
      <section className="w-[440px] shrink-0 border-r border-edge flex flex-col min-h-0">
        <header className="px-4 py-3 border-b border-edge">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold truncate">{project.name}</h2>
            <span className="text-[11px] font-mono text-zinc-500">{project.model}</span>
          </div>
          <p className="text-xs text-zinc-500 truncate">/{project.slug}</p>
        </header>

        <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {phase === "interview" && interview && (
            <div className="rounded-xl border border-edge bg-panel p-4">
              <p className="text-sm text-zinc-400 mb-3">
                Let's tailor your {interview.label.toLowerCase()} site.
              </p>
              <Interview interview={interview} projectId={project.id} onComplete={onInterviewComplete} />
            </div>
          )}

          {phase === "recommend" && (
            <div className="rounded-xl border border-edge bg-panel p-4">
              {recommendation ? (
                <StackPicker recommendation={recommendation} onChoose={onStackChosen} />
              ) : (
                <p className="text-sm text-zinc-400">Analyzing your requirements to recommend a stack…</p>
              )}
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-accent/10 border border-accent/20 ml-6"
                  : "bg-panel border border-edge mr-6"
              }`}
            >
              {m.text}
            </div>
          ))}

          {busy && activity.length > 0 && (
            <div className="rounded-xl border border-edge bg-black/40 p-3 font-mono text-[12px] space-y-1 mr-6">
              {activity.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.kind === "tool"
                      ? "text-accent"
                      : line.kind === "thinking"
                        ? "text-zinc-500 italic"
                        : "text-zinc-300"
                  }
                >
                  {line.kind === "tool" ? "› " : ""}
                  {line.text}
                </div>
              ))}
              <div className="text-zinc-600 animate-pulse">working…</div>
            </div>
          )}
        </div>

        {phase === "ready" && (
          <form onSubmit={onIterate} className="border-t border-edge p-3">
            <div className="flex gap-2">
              <input
                value={iterateText}
                onChange={(e) => setIterateText(e.target.value)}
                disabled={busy}
                placeholder="Make the hero bigger, add a contact section…"
                className="flex-1 rounded-lg bg-panel border border-edge px-3 py-2.5 text-sm outline-none focus:border-accent transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !iterateText.trim()}
                className="rounded-lg bg-accent text-ink font-medium px-4 text-sm disabled:opacity-40 hover:brightness-110 transition"
              >
                Send
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Right: live preview (static) OR run instructions (full-stack app) */}
      {isApp ? (
        <AppRunInfo runInfo={runInfo} busy={busy} />
      ) : (
        <Preview url={previewUrl} busy={busy} onRefresh={() => setPreviewVersion((v) => v + 1)} />
      )}
    </div>
  );
}
