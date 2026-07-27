import { useEffect, useState } from "react";
import { api, type ModelVersion } from "../lib/api";
import { TrainingWizard } from "./TrainingWizard";
import { Spinner, EmptyState } from "./ui";


interface ModelsViewProps {
  projectId: string;
  activeJob?: any;
  onJobStarted?: (job: any) => void;
}

export function ModelsView({ projectId, activeJob, onJobStarted }: ModelsViewProps) {
  const [models, setModels] = useState<ModelVersion[] | null>(null);
  const [starting, setStarting] = useState(false);

  const load = () => {
    api.listModels(projectId).then(setModels).catch(() => setModels([]));
  };

  useEffect(() => {
    load();
  }, [projectId]);

  // When job completes, reload models
  useEffect(() => {
    if (activeJob?.status === "completed") {
      load();
    }
  }, [activeJob?.status]);

  const onStartTraining = async (config: any) => {
    setStarting(true);
    try {
      const job = await api.startTraining(projectId, config);
      if (onJobStarted) onJobStarted(job);
    } catch (e: any) {
      alert("Failed to start: " + e.message);
    } finally {
      setStarting(false);
    }
  };

  const getUrl = (path?: string) => {
    if (!path) return "";
    return path.replace("/data", "").replace("data", ""); // crude map to /runs/...
  };

  return (
    <div className="flex flex-col gap-8">
      {activeJob && activeJob.status === "running" ? (
        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <h3 className="mb-2 text-[16px] font-semibold">Training in Progress</h3>
          <p className="mb-4 text-[13px] text-muted">
            Epoch {activeJob.current_epoch} of {activeJob.metrics?.max_epochs || "?"}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
            <div 
              className="h-full bg-accent transition-all duration-500" 
              style={{ width: `${Math.min(100, ((activeJob.current_epoch) / (activeJob.metrics?.max_epochs || 1)) * 100)}%` }}
            />
          </div>
          {activeJob.metrics && (
             <>
               <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-black/5 p-3">
                    <div className="text-[11px] text-muted">Box Loss</div>
                    <div className="font-mono text-[14px]">{activeJob.metrics["train/box_loss"]?.toFixed(4) || "-"}</div>
                  </div>
                  <div className="rounded-lg bg-black/5 p-3">
                    <div className="text-[11px] text-muted">Class Loss</div>
                    <div className="font-mono text-[14px]">{activeJob.metrics["train/cls_loss"]?.toFixed(4) || "-"}</div>
                  </div>
                  <div className="rounded-lg bg-black/5 p-3">
                    <div className="text-[11px] text-muted">mAP50</div>
                    <div className="font-mono text-[14px]">{activeJob.metrics["metrics/mAP50(B)"]?.toFixed(4) || "-"}</div>
                  </div>
                  <div className="rounded-lg bg-black/5 p-3">
                    <div className="text-[11px] text-muted">mAP50-95</div>
                    <div className="font-mono text-[14px]">{activeJob.metrics["metrics/mAP50-95(B)"]?.toFixed(4) || "-"}</div>
                  </div>
               </div>
               
               {activeJob.metrics.latest_log && (
                 <div className="mt-4 overflow-hidden rounded-xl bg-black px-4 py-3 font-mono text-[11px] leading-relaxed text-green-400 shadow-inner">
                   <pre className="whitespace-pre-wrap">{activeJob.metrics.latest_log}</pre>
                 </div>
               )}
             </>
          )}
        </div>
      ) : (
        <TrainingWizard onStart={onStartTraining} disabled={starting} />
      )}

      <div>
        <h3 className="mb-4 text-[16px] font-semibold">Evaluation Dashboard</h3>
        
        {!models ? (
          <Spinner />
        ) : models.length === 0 ? (
          <EmptyState title="No models yet" hint="Train a model to see evaluation metrics here." />
        ) : (
          <div className="flex flex-col gap-6">
            {models.map(m => (
              <div key={m.id} className="rounded-2xl border border-hairline bg-surface p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-[15px] font-medium">{m.name}</h4>
                    <span className="text-[12px] text-muted">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <div className="text-[11px] text-muted">mAP50</div>
                      <div className="font-mono text-[14px] font-medium">{(m.map50 || 0).toFixed(3)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted">mAP50-95</div>
                      <div className="font-mono text-[14px] font-medium">{(m.map50_95 || 0).toFixed(3)}</div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {m.confusion_matrix_path && (
                    <div className="overflow-hidden rounded-xl border border-hairline">
                      <div className="bg-black/5 px-3 py-1.5 text-[11px] font-medium">Confusion Matrix</div>
                      <img src={getUrl(m.confusion_matrix_path)} alt="Confusion Matrix" className="w-full" loading="lazy" />
                    </div>
                  )}
                  {m.val_batch_path && (
                    <div className="overflow-hidden rounded-xl border border-hairline">
                      <div className="bg-black/5 px-3 py-1.5 text-[11px] font-medium">Validation Predictions</div>
                      <img src={getUrl(m.val_batch_path)} alt="Validation Batch" className="w-full" loading="lazy" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
