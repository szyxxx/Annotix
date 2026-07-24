import { useEffect } from "react";
import { eventBus } from "./core/eventBus";
import { RuntimeProvider } from "./components/providers/RuntimeProvider";
import { WorkspaceDashboard } from "./components/layout/WorkspaceDashboard";
import { ProjectDashboard } from "./components/layout/ProjectDashboard";
import { useProjectStore } from "./store/projectStore";
import "./App.css";

function AppContent() {
  const activeProject = useProjectStore(state => state.activeProject);

  if (activeProject) {
    return (
      <main className="dark bg-background min-h-screen text-foreground antialiased font-sans checkered-bg">
        <ProjectDashboard />
      </main>
    );
  }

  return (
    <main className="dark bg-background min-h-screen text-foreground antialiased font-sans checkered-bg">
      <WorkspaceDashboard />
    </main>
  );
}

function App() {
  useEffect(() => {
    // We can add a top-level listener here for system events
    const unsub = eventBus.subscribe("System", "Ready", () => {
      console.log("App is ready.");
    });
    return unsub;
  }, []);

  return (
    <RuntimeProvider>
      <AppContent />
    </RuntimeProvider>
  );
}

export default App;
