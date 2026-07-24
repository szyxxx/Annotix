import { open } from "@tauri-apps/plugin-dialog";
import type { DatasetService } from "../application/services/DatasetService";
import type { JobQueue } from "./jobs/jobQueue";
import { eventBus } from "../core/eventBus";
import { logger } from "../lib/logger";

export class DatasetRuntime {
  constructor(
    private datasetService: DatasetService,
    private jobs: JobQueue
  ) {
    // Register the background job worker
    this.jobs.registerWorker("import-dataset", async (job, updateProgress) => {
      const payload = job.payload as { projectPath: string, sourceFolder: string };
      const { projectPath, sourceFolder } = payload;
      
      eventBus.emit("Project" as any, "DatasetImportStarted", { projectPath });
      
      await this.datasetService.importFolder(projectPath, sourceFolder, (progress, file) => {
        updateProgress(progress);
        eventBus.emit("Project" as any, "DatasetImportProgress", { projectPath, progress, file });
      });

      eventBus.emit("Project" as any, "DatasetImportCompleted", { projectPath });
    });
  }

  async importFolder(projectPath: string): Promise<void> {
    try {
      const selectedPath = await open({
        title: "Import Folder to Dataset",
        directory: true,
      });
      
      if (!selectedPath || Array.isArray(selectedPath)) {
        return; // Cancelled
      }

      logger.info(`Runtime: Triggering import job from ${selectedPath}`);
      
      // Enqueue the background job
      await this.jobs.enqueue("import-dataset", { 
        projectPath, 
        sourceFolder: selectedPath 
      });

    } catch (error: any) {
      logger.error(`Failed to trigger import: ${error.message}`);
      eventBus.emit("Project" as any, "DatasetImportFailed", { projectPath, error: error.message });
    }
  }

  async getAssets(projectPath: string): Promise<any[]> {
    // In a real application, DatasetService might have a getAssets method that returns DTOs.
    // For now we can expose it via the runtime properly.
    return await this.datasetService.getAssets(projectPath);
  }
}
