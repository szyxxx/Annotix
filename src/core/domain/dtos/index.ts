export interface CreateWorkspaceDTO {
  name: string;
  path: string; // Directory where the workspace is created
}

export interface CreateProjectDTO {
  workspaceId: string;
  name: string;
}

export interface UpdateWorkspaceSettingsDTO {
  theme?: "dark" | "light";
  aiConfig?: {
    useYolo: boolean;
    useGroundingDino: boolean;
    yoloModel: string;
  };
}

// Output DTOs for the UI (State Layer)
export interface ProjectSummaryDTO {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
}

export interface ProjectDTO {
  id: string;
  name: string;
  path: string;
  schemaVersion: number;
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  path: string;
  projects: ProjectSummaryDTO[];
}
