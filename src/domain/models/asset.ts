export interface Asset {
  id: string;
  path: string; // Relative path inside the project (e.g. "dataset/assets/image-001.jpg")
  filename: string;
  extension: string;
  width: number;
  height: number;
  size: number;
  hash?: string; // Optional for now
  createdAt: number;
  updatedAt: number;
}

export interface AssetManifest {
  schema_version: number;
  assets: Asset[];
}
