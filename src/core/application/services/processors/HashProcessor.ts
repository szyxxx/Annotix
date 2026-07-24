import type { AssetProcessor, AssetPipelineContext } from "./AssetProcessor";
import type { Asset } from "../../../domain/models/asset";
import { logger } from "../../../../shared/lib/logger";

export class HashProcessor implements AssetProcessor {
  async process(asset: Asset, context: AssetPipelineContext): Promise<Asset> {
    logger.info(`HashProcessor: Hashing ${asset.path}`);
    
    try {
      const destPath = `${context.projectPath}/${asset.path}`;
      const fileData = await context.storage.readFile(destPath);
      
      const hashBuffer = await crypto.subtle.digest("SHA-256", fileData.buffer as ArrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      
      asset.hash = hashHex;
      logger.info(`HashProcessor: Generated hash ${hashHex} for ${asset.path}`);
    } catch (e: any) {
      logger.error(`HashProcessor failed for ${asset.path}: ${e.message}`);
      throw e;
    }

    return asset;
  }
}
