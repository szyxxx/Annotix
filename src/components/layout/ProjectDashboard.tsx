import React, { useEffect } from "react";
import { useRuntime } from "../../hooks/useRuntime";
import { useProjectStore } from "../../store/projectStore";
import { eventBus } from "../../core/eventBus";
import { logger } from "../../lib/logger";

export const ProjectDashboard: React.FC = () => {
  const runtime = useRuntime();
  const { activeProject, assets, importProgress, setImportProgress, setAssets } = useProjectStore();

  useEffect(() => {
    if (!activeProject) return;

    // Load assets initially
    const loadAssets = async () => {
      // Direct call via runtime or just through a command
      // Since we don't have a specific `getAssets` on datasetRuntime yet, we can use the repository directly via a temporary bypass, 
      // but according to ADR-0004 we MUST NOT access the Repository from UI.
      // So I will add `runtime.dataset.getAssets(projectPath)` to datasetRuntime.
      try {
        const loadedAssets = await runtime.dataset.getAssets(activeProject.path);
        setAssets(loadedAssets);
      } catch (err: any) {
        logger.error(`Failed to load assets: ${err.message}`);
      }
    };
    
    loadAssets();

    // Subscribe to background job events
    const onStart = () => setImportProgress(true, 0, "");
    const onProgress = (payload: any) => setImportProgress(true, payload.progress, payload.file);
    const onCompleted = () => {
      setImportProgress(false);
      runtime.notifications.success("Dataset import completed!");
      loadAssets(); // Reload assets
    };
    const onFailed = (payload: any) => {
      setImportProgress(false);
      runtime.notifications.error(`Import failed: ${payload.error}`);
    };

    const unsubStart = eventBus.subscribe("Project" as any, "DatasetImportStarted", onStart);
    const unsubProgress = eventBus.subscribe("Project" as any, "DatasetImportProgress", onProgress);
    const unsubComplete = eventBus.subscribe("Project" as any, "DatasetImportCompleted", onCompleted);
    const unsubFailed = eventBus.subscribe("Project" as any, "DatasetImportFailed", onFailed);

    return () => {
      unsubStart();
      unsubProgress();
      unsubComplete();
      unsubFailed();
    };
  }, [activeProject, runtime, setAssets, setImportProgress]);

  if (!activeProject) {
    return <div className="text-white p-8">No active project.</div>;
  }

  const handleImport = async () => {
    await runtime.dataset.importFolder(activeProject.path);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-card/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-lg">{activeProject.name}</h1>
          <span className="text-xs text-muted-foreground bg-primary/20 px-2 py-1 rounded-full">v{activeProject.schemaVersion}</span>
        </div>
        <button 
          onClick={handleImport}
          disabled={importProgress.isImporting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
        >
          {importProgress.isImporting ? "Importing..." : "Import Folder"}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 z-10 overflow-auto">
        {importProgress.isImporting && (
          <div className="mb-6 p-4 rounded-lg bg-card border border-white/10">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Importing: {importProgress.currentFile}</span>
              <span className="font-mono">{importProgress.progress}%</span>
            </div>
            <div className="h-1 bg-black/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${importProgress.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-card overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h2 className="font-medium">Assets ({assets.length})</h2>
          </div>
          
          {assets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No assets found. Click "Import Folder" to begin.
            </div>
          ) : (
            <ul className="divide-y divide-white/10">
              {assets.map((asset: any) => (
                <li key={asset.id} className="p-3 px-4 hover:bg-white/5 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase">
                      {asset.extension.replace(".", "")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{asset.filename}</p>
                      <p className="text-xs text-muted-foreground">{asset.path}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};
