async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${method} ${url} failed (${res.status})`);
  return data;
}

export const api = {
  listProjects: () => req("GET", "/api/projects"),
  getProject: (id) => req("GET", `/api/projects/${id}`),
  createProject: (payload) => req("POST", "/api/projects", payload),
  recommendStack: (id, answers) =>
    req("POST", `/api/projects/${id}/recommend-stack`, { answers }),
  deleteLogo: (id) => req("DELETE", `/api/projects/${id}/logo`),
  deleteProject: (id, deleteFiles) =>
    req("DELETE", `/api/projects/${id}`, { deleteFiles }),
};

/**
 * Upload a logo file via multipart/form-data. We deliberately do NOT set the
 * Content-Type header — the browser sets it with the correct multipart boundary.
 *
 * @param {string} projectId
 * @param {File} file
 * @returns {Promise<{ logo_path: string, previewUrl: string }>}
 */
export async function uploadLogo(projectId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/projects/${projectId}/logo`, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Logo upload failed (${res.status})`);
  return data;
}

/**
 * Stream a generation/iteration via SSE using fetch + a manual parser
 * (EventSource only supports GET; we need POST with a body).
 *
 * @param {string} projectId
 * @param {object} payload  { answers } or { instruction }
 * @param {(event: string, data: object) => void} onEvent
 * @param {AbortSignal} [signal]
 */
export async function streamGenerate(projectId, payload, onEvent, signal) {
  const res = await fetch(`/api/projects/${projectId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Generation request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      let eventName = "message";
      let dataLine = "";
      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        onEvent(eventName, JSON.parse(dataLine));
      } catch {
        onEvent(eventName, { raw: dataLine });
      }
    }
  }
}
