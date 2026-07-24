import type { Workspace } from "../../domain/models/workspace";
import type { WorkspaceRepository } from "../../application/ports/WorkspaceRepository";
import type { StorageProvider } from "../../application/ports/StorageProvider";

export class TauriWorkspaceRepository implements WorkspaceRepository {
  constructor(private storage: StorageProvider) {}

  private getWorkspaceFilePath(workspacePath: string): string {
    return `${workspacePath}/workspace.annotix`;
  }

  async createWorkspace(workspace: Workspace): Promise<void> {
    await this.storage.createDir(workspace.path, true);
    await this.storage.createDir(`${workspace.path}/projects`, true);
    await this.storage.createDir(`${workspace.path}/cache`, true);
    await this.storage.createDir(`${workspace.path}/settings`, true);
    
    await this.updateWorkspace(workspace);
  }

  async getWorkspace(path: string): Promise<Workspace | null> {
    const file = this.getWorkspaceFilePath(path);
    if (!(await this.storage.exists(file))) {
      return null;
    }
    const content = await this.storage.readText(file);
    return JSON.parse(content) as Workspace;
  }

  async updateWorkspace(workspace: Workspace): Promise<void> {
    const file = this.getWorkspaceFilePath(workspace.path);
    await this.storage.writeText(file, JSON.stringify(workspace, null, 2));
  }
}
