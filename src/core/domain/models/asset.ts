export enum AssetStatus {
  Pending = "Pending",
  Importing = "Importing",
  Processing = "Processing",
  Ready = "Ready",
  Failed = "Failed"
}

export interface Asset {
  id: string;
  path: string; // Relative path inside the project (e.g. "dataset/assets/image-001.jpg")
  filename: string;
  extension: string;
  status: AssetStatus;
  width: number;
  height: number;
  size: number;
  mime?: string;
  hash?: string;
  thumbnailPath?: string; // Relative path to thumbnail (e.g. "dataset/thumbnails/<hash>.webp")
  error?: string; // If status is Failed
  createdAt: number;
  updatedAt: number;
}

export interface AssetManifest {
  schema_version: number;
  assets: Asset[];
}
