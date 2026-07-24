import React from 'react';
import { useRuntime } from '../../hooks/useRuntime';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useProjectStore } from '../../stores/projectStore';

export const WorkspaceDashboard: React.FC = () => {
  const runtime = useRuntime();
  const currentWorkspace = useWorkspaceStore((state: any) => state.currentWorkspace);

  const handleCreateWorkspace = async () => {
    // This will now trigger the Tauri save dialog
    await runtime.workspace.create();
  };

  const handleOpenWorkspace = async () => {
    // This will now trigger the Tauri open directory dialog
    await runtime.workspace.open();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-ring/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 max-w-4xl w-full flex flex-col items-center space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Annotix
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            The open-source, offline-first computer vision platform for professionals.
          </p>
        </div>

        {currentWorkspace ? (
          <div className="w-full bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6">Current Workspace</h2>
            <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-6">
              <h3 className="text-xl font-medium">{currentWorkspace.name}</h3>
              <p className="text-sm text-muted-foreground font-mono mt-1">{currentWorkspace.path}</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white/80">Projects ({currentWorkspace.projects.length})</h3>
                <button 
                  onClick={async () => {
                    const name = prompt("Enter project name:");
                    if (name) {
                      const project = await runtime.project.create(currentWorkspace.path, { 
                        name,
                        workspaceId: currentWorkspace.id 
                      });
                      if (project) {
                        useProjectStore.getState().setActiveProject(project as any);
                      }
                    }
                  }}
                  className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  + New Project
                </button>
              </div>
              {currentWorkspace.projects.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-white/20 rounded-xl text-muted-foreground">
                  No projects yet. Create one to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {currentWorkspace.projects.map((p: any) => (
                    <div 
                      key={p.id} 
                      onClick={async () => {
                        const project = await runtime.project.open(p.path);
                        if (project) {
                          useProjectStore.getState().setActiveProject(project as any);
                        }
                      }}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <h4 className="font-medium text-lg">{p.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{p.path}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            <button 
              onClick={handleCreateWorkspace}
              className="group relative flex flex-col items-center justify-center p-8 bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Create Workspace</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center">Start a new isolated environment</p>
            </button>

            <button 
              onClick={handleOpenWorkspace}
              className="group relative flex flex-col items-center justify-center p-8 bg-card/40 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Open Workspace</h3>
              <p className="text-sm text-muted-foreground mt-2 text-center">Load an existing workspace</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
