import React, { useEffect } from "react";
import { useRuntime } from "../../hooks/useRuntime";
import { useProjectStore } from "../../stores/projectStore";
import { eventBus } from "../../../shared/core/eventBus";
import { logger } from "../../../shared/lib/logger";

export const ProjectDashboard: React.FC = () => {
  const runtime = useRuntime();
  const { activeProject, assets, importProgress, setImportProgress, setAssets, updateAsset } = useProjectStore();

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

    const unsubAssetImported = eventBus.subscribe("Project" as any, "AssetImported", (payload: any) => updateAsset(payload.asset));
    const unsubAssetProcessing = eventBus.subscribe("Project" as any, "AssetProcessingStarted", (payload: any) => updateAsset(payload.asset));
    const unsubAssetReady = eventBus.subscribe("Project" as any, "AssetReady", (payload: any) => updateAsset(payload.asset));
    const unsubAssetFail = eventBus.subscribe("Project" as any, "AssetFailed", (payload: any) => updateAsset(payload.asset));

    return () => {
      unsubStart();
      unsubProgress();
      unsubComplete();
      unsubFailed();
      unsubAssetImported();
      unsubAssetProcessing();
      unsubAssetReady();
      unsubAssetFail();
    };
  }, [activeProject, runtime, setAssets, setImportProgress, updateAsset]);

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
          <button 
            onClick={() => useProjectStore.getState().setActiveProject(null as any)}
            className="text-muted-foreground hover:text-white transition-colors"
            title="Back to Workspace"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="w-px h-6 bg-white/10 mx-2"></div>
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
                  <div className="flex items-center gap-4">
                    {/* Visual Indicator */}
                    {asset.status === "Ready" && asset.thumbnailPath ? (
                      <div className="w-10 h-10 rounded overflow-hidden bg-black/20 flex-shrink-0 border border-white/10">
                        {/* We use a secure custom protocol or object URL in reality, here we assume it maps to a reachable path in dev, 
                            or we can just show an icon for now if we don't have the Tauri fs-to-url mapping yet. */}
                        <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-500 text-xs">
                          🖼️
                        </div>
                      </div>
                    ) : asset.status === "Processing" || asset.status === "Pending" ? (
                      <div className="w-10 h-10 rounded bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : asset.status === "Failed" ? (
                      <div className="w-10 h-10 rounded bg-destructive/10 text-destructive flex items-center justify-center font-bold flex-shrink-0">
                        !
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase flex-shrink-0">
                        {asset.extension.replace(".", "")}
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {asset.filename}
                        {asset.status === "Ready" && asset.width && asset.height && (
                          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-muted-foreground">
                            {asset.width} × {asset.height}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {asset.status === "Processing" ? (
                          <span className="text-xs text-primary animate-pulse">Processing... ██████</span>
                        ) : asset.status === "Failed" ? (
                          <span className="text-xs text-destructive">Failed: {asset.error || "Unknown error"}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{asset.status}</span>
                        )}
                      </div>
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
