import type { AssetProcessor, AssetPipelineContext } from "./AssetProcessor";
import type { Asset } from "../../../domain/models/asset";
import { logger } from "../../../../shared/lib/logger";

export class CopyProcessor implements AssetProcessor {
  async process(asset: Asset, context: AssetPipelineContext): Promise<Asset> {
    logger.info(`CopyProcessor: Copying ${context.sourcePath} to ${asset.path}`);
    
    // Ensure the parent directory exists
    const projectAssetsDir = `${context.projectPath}/dataset/assets`;
    try {
      await context.storage.createDir(projectAssetsDir, true);
    } catch (e) {
      // Ignore if exists
    }

    const destPath = `${context.projectPath}/${asset.path}`;
    await context.storage.copyFile(context.sourcePath, destPath);
    
    // Attempt to get file size
    try {
      const fileData = await context.storage.readFile(destPath);
      asset.size = fileData.byteLength;
    } catch (e: any) {
      logger.warn(`Could not determine size for ${asset.path}: ${e.message}`);
    }

    return asset;
  }
}
