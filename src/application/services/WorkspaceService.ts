import type { WorkspaceRepository } from "../ports/WorkspaceRepository";
import type { CreateWorkspaceDTO } from "../../domain/dtos";
import type { Workspace } from "../../domain/models/workspace";
import { eventBus } from "../../core/eventBus";

export class WorkspaceService {
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async createWorkspace(dto: CreateWorkspaceDTO): Promise<Workspace> {
    const workspace: Workspace = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      name: dto.name,
      path: dto.path,
      createdAt: Date.now(),
      projects: [],
      settings: {}
    };

    await this.workspaceRepo.createWorkspace(workspace);
    eventBus.emit("System", "WorkspaceCreated", workspace);
    return workspace;
  }

  async openWorkspace(path: string): Promise<Workspace | null> {
    const workspace = await this.workspaceRepo.getWorkspace(path);
    if (workspace) {
      eventBus.emit("System", "WorkspaceOpened", workspace);
    }
    return workspace;
  }
}
