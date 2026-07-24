import type { Asset } from "../../../domain/models/asset";
import type { StorageProvider } from "../../ports/StorageProvider";

export interface AssetPipelineContext {
  projectPath: string;
  storage: StorageProvider;
  sourcePath: string;
}

export interface AssetProcessor {
  process(asset: Asset, context: AssetPipelineContext): Promise<Asset>;
}
