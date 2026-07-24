import type { AssetRepository } from "../../application/ports/AssetRepository";
import type { StorageProvider } from "../../application/ports/StorageProvider";
import type { Asset, AssetManifest } from "../../domain/models/asset";

export class TauriAssetRepository implements AssetRepository {
  constructor(private storage: StorageProvider) {}

  private getManifestPath(projectPath: string): string {
    return `${projectPath}/dataset/metadata/assets.json`;
  }

  async loadManifest(projectPath: string): Promise<AssetManifest> {
    const manifestPath = this.getManifestPath(projectPath);
    try {
      const data = await this.storage.readText(manifestPath);
      return JSON.parse(data) as AssetManifest;
    } catch (e) {
      // If manifest doesn't exist, return a default empty manifest
      return {
        schema_version: 1,
        assets: []
      };
    }
  }

  async saveManifest(projectPath: string, manifest: AssetManifest): Promise<void> {
    const manifestPath = this.getManifestPath(projectPath);
    const dir = manifestPath.substring(0, manifestPath.lastIndexOf("/"));
    
    // Ensure metadata directory exists
    try {
      await this.storage.createDir(dir, true);
    } catch (e) {
      // Directory might already exist
    }

    await this.storage.writeText(manifestPath, JSON.stringify(manifest, null, 2));
  }

  async addAsset(projectPath: string, asset: Asset): Promise<void> {
    const manifest = await this.loadManifest(projectPath);
    manifest.assets.push(asset);
    await this.saveManifest(projectPath, manifest);
  }

  async getAllAssets(projectPath: string): Promise<Asset[]> {
    const manifest = await this.loadManifest(projectPath);
    return manifest.assets;
  }
}
