export interface ProjectSummary {
  id: string;
  name: string;
  path: string; // Relative or absolute path depending on storage
  lastOpened: number;
}

export interface WorkspaceSettings {
  theme?: "dark" | "light";
  aiConfig?: {
    useYolo: boolean;
    useGroundingDino: boolean;
    yoloModel: string;
  };
}

export interface Workspace {
  schemaVersion: number;
  id: string;
  name: string;
  path: string; // Absolute path to the workspace directory
  createdAt: number;
  projects: ProjectSummary[];
  settings: WorkspaceSettings;
}
