import type { AssetRepository } from "../ports/AssetRepository";
import type { StorageProvider } from "../ports/StorageProvider";
import type { Asset } from "../../domain/models/asset";
import { logger } from "../../lib/logger";

const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"];

export class DatasetService {
  constructor(
    private assetRepo: AssetRepository,
    private storage: StorageProvider
  ) {}

  async importFolder(
    projectPath: string, 
    sourceFolder: string, 
    onProgress?: (progress: number, currentFile: string) => void
  ): Promise<void> {
    logger.info(`DatasetService: Scanning folder ${sourceFolder}`);
    
    // 1. Gather all valid image files recursively
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

    // 2. Ensure project asset directory exists
    const assetsDir = `${projectPath}/dataset/assets`;
    try {
      await this.storage.createDir(assetsDir, true);
    } catch (e) {
      // Ignore if exists
    }

    // 3. Copy files and register assets
    const manifest = await this.assetRepo.loadManifest(projectPath);
    let processed = 0;

    for (const sourcePath of filesToImport) {
      const filename = sourcePath.split(/[/\\]/).pop() || "unknown.jpg";
      const destPath = `${assetsDir}/${filename}`;
      const relativePath = `dataset/assets/${filename}`;
      const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();

      try {
        // Copy physical file
        await this.storage.copyFile(sourcePath, destPath);

        // Register Asset
        const assetId = crypto.randomUUID();
        const asset: Asset = {
          id: assetId,
          path: relativePath,
          filename,
          extension: ext,
          width: 0, // Will be updated by UI/Runtime later
          height: 0,
          size: 0, // Placeholder
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        manifest.assets.push(asset);
        
        processed++;
        if (onProgress) {
          onProgress(Math.round((processed / totalFiles) * 100), filename);
        }
      } catch (err: any) {
        logger.error(`Failed to import file ${filename}: ${err.message}`);
      }
    }

    // Save manifest once at the end for performance
    await this.assetRepo.saveManifest(projectPath, manifest);
    logger.info(`Successfully imported ${processed} assets.`);
  }

  async getAssets(projectPath: string): Promise<Asset[]> {
    return await this.assetRepo.getAllAssets(projectPath);
  }
}
