import { exists, readTextFile, writeTextFile, mkdir, readDir, copyFile } from "@tauri-apps/plugin-fs";
import type { StorageProvider } from "../../application/ports/StorageProvider";

export class TauriStorageProvider implements StorageProvider {
  async exists(path: string): Promise<boolean> {
    return await exists(path);
  }

  async readText(path: string): Promise<string> {
    return await readTextFile(path);
  }

  async writeText(path: string, content: string): Promise<void> {
    await writeTextFile(path, content);
  }

  async createDir(path: string, recursive: boolean): Promise<void> {
    await mkdir(path, { recursive });
  }

  async readDir(path: string): Promise<{ name: string; isDirectory: boolean }[]> {
    const entries = await readDir(path);
    return entries.map(e => ({ name: e.name || "", isDirectory: e.isDirectory }));
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await copyFile(source, destination);
  }
}
