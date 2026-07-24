import type { ANFLabel } from "../../../shared/types";

export type ProjectState = "Created" | "Loading" | "Ready" | "Saving" | "Closed" | "Error";

export interface ProjectSettings {
  defaultConfidenceThreshold?: number;
  autoSave?: boolean;
}

export interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  path: string; // Directory path
  createdAt: number;
  dataset: {
    classes: ANFLabel[];
  };
  history: Record<string, any>;
  settings: ProjectSettings;
  
  // Runtime State (Not persisted to storage)
  _state?: ProjectState;
}
