/**
 * Turn a raw claude stream-json event into a compact activity line for the UI.
 * Returns null for events we don't want to surface.
 *
 * @param {object} event
 * @returns {{ kind: string, text: string } | null}
 */
export function formatClaudeEvent(event) {
  if (!event || typeof event !== "object") return null;

  if (event.type === "system" && event.subtype === "init") {
    return { kind: "system", text: `Session started · ${event.session_id?.slice(0, 8) ?? "?"}` };
  }

  if (event.type === "assistant" && event.message?.content) {
    const parts = event.message.content;
    for (const part of parts) {
      if (part.type === "text" && part.text?.trim()) {
        return { kind: "text", text: part.text.trim() };
      }
      if (part.type === "thinking" && part.thinking?.trim()) {
        return { kind: "thinking", text: part.thinking.trim().slice(0, 240) };
      }
      if (part.type === "tool_use") {
        return { kind: "tool", text: describeTool(part.name, part.input) };
      }
    }
    return null;
  }

  if (event.type === "tool_use_start") {
    return { kind: "tool", text: describeTool(event.tool_name ?? event.name, event.input) };
  }

  if (event.type === "raw" && event.text) {
    return { kind: "raw", text: event.text };
  }

  return null;
}

function describeTool(name, input) {
  if (!name) return "Working…";
  const file = input?.file_path ?? input?.path;
  switch (name) {
    case "Write":
      return `Writing ${shortPath(file)}`;
    case "Edit":
      return `Editing ${shortPath(file)}`;
    case "Read":
      return `Reading ${shortPath(file)}`;
    case "Bash":
      return `Running: ${(input?.command ?? "").slice(0, 60)}`;
    default:
      return file ? `${name}: ${shortPath(file)}` : name;
  }
}

function shortPath(p) {
  if (!p) return "file";
  const parts = String(p).split("/");
  return parts.slice(-2).join("/");
}
