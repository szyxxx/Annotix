import type { AssetRepository } from "../ports/AssetRepository";
import type { StorageProvider } from "../ports/StorageProvider";
import { Asset, AssetStatus } from "../../domain/models/asset";
import { logger } from "../../../shared/lib/logger";
import { eventBus } from "../../../shared/core/eventBus";
import { CopyProcessor } from "./processors/CopyProcessor";
import { HashProcessor } from "./processors/HashProcessor";
import { MetadataProcessor } from "./processors/MetadataProcessor";
import { ThumbnailProcessor } from "./processors/ThumbnailProcessor";
import type { AssetProcessor, AssetPipelineContext } from "./processors/AssetProcessor";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"];

export class DatasetService {
  private processors: AssetProcessor[];

  constructor(
    private assetRepo: AssetRepository,
    private storage: StorageProvider
  ) {
    this.processors = [
      new CopyProcessor(),
      new HashProcessor(),
      new MetadataProcessor(),
      new ThumbnailProcessor()
    ];
  }

  async importFolder(
    projectPath: string, 
    sourceFolder: string, 
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<void> {
    logger.info(`DatasetService: Scanning folder ${sourceFolder}`);
    
    const filesToImport: string[] = [];
    
    const scanDir = async (dirPath: string) => {
      try {
        const entries = await this.storage.readDir(dirPath);
        for (const entry of entries) {
          const fullPath = `${dirPath}/${entry.name}`;
          if (entry.isDirectory) {
            await scanDir(fullPath);
          } else {
            const ext = entry.name.substring(entry.name.lastIndexOf(".")).toLowerCase();
            if (SUPPORTED_EXTENSIONS.includes(ext)) {
              filesToImport.push(fullPath);
            }
          }
        }
      } catch (err: any) {
        logger.error(`Failed to scan dir ${dirPath}: ${err.message}`);
      }
    };

    await scanDir(sourceFolder);
    const totalFiles = filesToImport.length;
    logger.info(`Found ${totalFiles} supported images to import.`);

    if (totalFiles === 0) return;

    const manifest = await this.assetRepo.loadManifest(projectPath);
    let processed = 0;

    for (const sourcePath of filesToImport) {
      const filename = sourcePath.split(/[/\\]/).pop() || "unknown.jpg";
      const relativePath = `dataset/assets/${filename}`;
      const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();

      const assetId = crypto.randomUUID();
      let asset: Asset = {
        id: assetId,
        path: relativePath,
        filename,
        extension: ext,
        status: AssetStatus.Pending,
        width: 0,
        height: 0,
        size: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      manifest.assets.push(asset);
      await this.assetRepo.saveManifest(projectPath, manifest); // Save early so UI sees Pending

      eventBus.emit("Project", "AssetImported", { projectPath, asset });
      
      const context: AssetPipelineContext = {
        projectPath,
        storage: this.storage,
        sourcePath
      };

      try {
        asset.status = AssetStatus.Processing;
        await this.assetRepo.saveManifest(projectPath, manifest);
        eventBus.emit("Project", "AssetProcessingStarted", { projectPath, asset });

        // Run Pipeline
        for (const processor of this.processors) {
          asset = await processor.process(asset, context);
        }

        asset.status = AssetStatus.Ready;
        asset.updatedAt = Date.now();
        eventBus.emit("Project", "AssetThumbnailGenerated", { projectPath, asset });
        eventBus.emit("Project", "AssetReady", { projectPath, asset });

      } catch (err: any) {
        logger.error(`Pipeline failed for ${filename}: ${err.message}`);
        asset.status = AssetStatus.Failed;
        asset.error = err.message;
        asset.updatedAt = Date.now();
        eventBus.emit("Project", "AssetFailed", { projectPath, asset, error: err.message });
      }

      await this.assetRepo.saveManifest(projectPath, manifest);

      processed++;
      if (onProgress) {
        onProgress(Math.round((processed / totalFiles) * 100), filename);
      }
    }

    logger.info(`Successfully imported ${processed} assets.`);
  }

  async getAssets(projectPath: string): Promise<Asset[]> {
    return await this.assetRepo.getAllAssets(projectPath);
  }
}
