import { useEffect, useState, useCallback } from "react";
import { api } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import NewProject from "./components/NewProject.jsx";
import Workspace from "./components/Workspace.jsx";

export default function App() {
  const [projects, setProjects] = useState([]);
  const [active, setActive] = useState(null); // { project, interview? }
  const [view, setView] = useState("new"); // "new" | "workspace"
  const [error, setError] = useState(null);

  const refreshProjects = useCallback(async () => {
    try {
      const { projects } = await api.listProjects();
      setProjects(projects);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const openProject = useCallback(async (id) => {
    try {
      const { project } = await api.getProject(id);
      setActive({ project, interview: null });
      setView("workspace");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const handleCreated = useCallback(({ project, interview }) => {
    setActive({ project, interview });
    setView("workspace");
    refreshProjects();
  }, [refreshProjects]);

  const startNew = useCallback(() => {
    setActive(null);
    setView("new");
  }, []);

  return (
    <div className="flex h-full">
      <Sidebar
        projects={projects}
        activeId={active?.project?.id}
        onSelect={openProject}
        onNew={startNew}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        {error && (
          <div className="bg-red-950/60 border-b border-red-800 text-red-200 text-sm px-4 py-2">
            {error}
            <button className="ml-3 underline" onClick={() => setError(null)}>
              dismiss
            </button>
          </div>
        )}
        {view === "new" && <NewProject onCreated={handleCreated} onError={setError} />}
        {view === "workspace" && active?.project && (
          <Workspace
            key={active.project.id}
            initialProject={active.project}
            initialInterview={active.interview}
            onProjectUpdated={refreshProjects}
          />
        )}
      </main>
    </div>
  );
}
