import { FolderPlus, FolderOpen, History } from "lucide-react";
import type { AnnotixProject } from "../../../shared/types";

interface HomeViewProps {
  recentProjects: AnnotixProject[];
  onCreateProject: () => void;
  onOpenProject: (path?: string) => void;
}

export default function HomeView({ recentProjects, onCreateProject, onOpenProject }: HomeViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto bg-zinc-950 p-8 h-full">
      <div className="max-w-4xl w-full mt-12 space-y-12">
        
        {/* Header Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center mb-2">
            <img src="/annotix.png" alt="Annotix Logo" className="h-24 w-auto object-contain" />
          </div>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            The next-generation AI-assisted annotation tool for your computer vision datasets. Start a new project or continue where you left off.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button 
            onClick={onCreateProject}
            className="group flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-900 border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FolderPlus className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Create New Project</h3>
            <p className="text-sm text-zinc-500">Initialize a new dataset folder and define your annotation classes.</p>
          </button>

          <button 
            onClick={() => onOpenProject()}
            className="group flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-900 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all shadow-xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FolderOpen className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Open Project</h3>
            <p className="text-sm text-zinc-500">Open an existing dataset folder that has been configured with Annotix.</p>
          </button>
        </div>

        {/* Recent Projects */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-400 border-b border-white/5 pb-2">
            <History size={18} />
            <h3 className="font-medium">Recent Projects</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {recentProjects.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 bg-zinc-900/50 rounded-2xl border border-white/5 border-dashed">
                No recent projects found.
              </div>
            ) : (
              recentProjects.map((project, idx) => (
                <button 
                  key={`${project.id}-${idx}`}
                  onClick={() => onOpenProject(project.path)}
                  className="flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800 rounded-2xl border border-white/5 transition-colors group text-left"
                >
                  <div>
                    <h4 className="text-white font-medium mb-1">{project.name}</h4>
                    <p className="text-xs text-zinc-500 font-mono truncate max-w-md">{project.path}</p>
                  </div>
                  <div className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <span className="px-2 py-1 bg-white/5 rounded-md">{project.classes.length} classes</span>
                    <span>Opened {new Date(project.lastOpened).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
