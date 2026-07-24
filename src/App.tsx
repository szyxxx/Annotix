import { useEffect } from "react";
import { eventBus } from "./shared/core/eventBus";
import { RuntimeProvider } from "./ui/components/providers/RuntimeProvider";
import { WorkspaceDashboard } from "./ui/components/layout/WorkspaceDashboard";
import { ProjectDashboard } from "./ui/components/layout/ProjectDashboard";
import { useProjectStore } from "./ui/stores/projectStore";
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
