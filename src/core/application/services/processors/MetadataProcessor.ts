import type { AssetProcessor, AssetPipelineContext } from "./AssetProcessor";
import type { Asset } from "../../../domain/models/asset";
import { logger } from "../../../../shared/lib/logger";

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

export class MetadataProcessor implements AssetProcessor {
  async process(asset: Asset, context: AssetPipelineContext): Promise<Asset> {
    logger.info(`MetadataProcessor: Extracting metadata for ${asset.path}`);
    
    try {
      const destPath = `${context.projectPath}/${asset.path}`;
      const fileData = await context.storage.readFile(destPath);
      
      const ext = asset.extension.toLowerCase();
      const mime = EXTENSION_TO_MIME[ext] || "application/octet-stream";
      asset.mime = mime;

      // Use HTMLImageElement to get width and height
      const blob = new Blob([new Uint8Array(fileData)], { type: mime });
      const objectUrl = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          asset.width = img.width;
          asset.height = img.height;
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to load image for metadata extraction"));
        };
        img.src = objectUrl;
      });

      logger.info(`MetadataProcessor: Extracted ${asset.width}x${asset.height} for ${asset.path}`);
    } catch (e: any) {
      logger.error(`MetadataProcessor failed for ${asset.path}: ${e.message}`);
      throw e;
    }

    return asset;
  }
}
