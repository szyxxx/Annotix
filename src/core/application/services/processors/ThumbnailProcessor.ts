import type { AssetProcessor, AssetPipelineContext } from "./AssetProcessor";
import type { Asset } from "../../../domain/models/asset";
import { logger } from "../../../../shared/lib/logger";

const THUMBNAIL_MAX_SIZE = 256;

export class ThumbnailProcessor implements AssetProcessor {
  async process(asset: Asset, context: AssetPipelineContext): Promise<Asset> {
    logger.info(`ThumbnailProcessor: Generating thumbnail for ${asset.path}`);
    
    if (!asset.hash) {
      throw new Error("ThumbnailProcessor requires asset.hash to be set first.");
    }

    try {
      // Ensure thumbnails directory exists
      const thumbnailsDir = `${context.projectPath}/dataset/thumbnails`;
      try {
        await context.storage.createDir(thumbnailsDir, true);
      } catch (e) {
        // Ignore if exists
      }

      const thumbnailFilename = `${asset.hash}.webp`;
      const thumbnailRelativePath = `dataset/thumbnails/${thumbnailFilename}`;
      const destThumbnailPath = `${context.projectPath}/${thumbnailRelativePath}`;

      // Check if thumbnail already exists to utilize cache
      const exists = await context.storage.exists(destThumbnailPath).catch(() => false);
      if (exists) {
        logger.info(`ThumbnailProcessor: Thumbnail already exists for ${asset.hash}`);
        asset.thumbnailPath = thumbnailRelativePath;
        return asset;
      }

      // Load original image
      const destPath = `${context.projectPath}/${asset.path}`;
      const fileData = await context.storage.readFile(destPath);
      const blob = new Blob([new Uint8Array(fileData)], { type: asset.mime || "image/jpeg" });
      const objectUrl = URL.createObjectURL(blob);

      const thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          
          let width = img.width;
          let height = img.height;
          
          if (width > THUMBNAIL_MAX_SIZE || height > THUMBNAIL_MAX_SIZE) {
            if (width > height) {
              height = Math.round(height * (THUMBNAIL_MAX_SIZE / width));
              width = THUMBNAIL_MAX_SIZE;
            } else {
              width = Math.round(width * (THUMBNAIL_MAX_SIZE / height));
              height = THUMBNAIL_MAX_SIZE;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create blob from canvas"));
          }, "image/webp", 0.8);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to load image for thumbnail generation"));
        };
        img.src = objectUrl;
      });

      // Save thumbnail blob to storage
      const arrayBuffer = await thumbnailBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await context.storage.writeFile(destThumbnailPath, uint8Array);
      
      asset.thumbnailPath = thumbnailRelativePath;
      logger.info(`ThumbnailProcessor: Generated thumbnail ${thumbnailRelativePath}`);
    } catch (e: any) {
      logger.error(`ThumbnailProcessor failed for ${asset.path}: ${e.message}`);
      throw e;
    }

    return asset;
  }
}
