export interface StorageProvider {
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, content: Uint8Array): Promise<void>;
  createDir(path: string, recursive: boolean): Promise<void>;
  readDir(path: string): Promise<{ name: string; isDirectory: boolean }[]>;
  copyFile(source: string, destination: string): Promise<void>;
}
