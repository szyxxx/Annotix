import type { Workspace } from "../../domain/models/workspace";

export interface WorkspaceRepository {
  createWorkspace(workspace: Workspace): Promise<void>;
  getWorkspace(path: string): Promise<Workspace | null>;
  updateWorkspace(workspace: Workspace): Promise<void>;
}
