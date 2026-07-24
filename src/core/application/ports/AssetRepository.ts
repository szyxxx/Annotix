import type { Asset, AssetManifest } from "../../domain/models/asset";

export interface AssetRepository {
  loadManifest(projectPath: string): Promise<AssetManifest>;
  saveManifest(projectPath: string, manifest: AssetManifest): Promise<void>;
  addAsset(projectPath: string, asset: Asset): Promise<void>;
  getAllAssets(projectPath: string): Promise<Asset[]>;
}
