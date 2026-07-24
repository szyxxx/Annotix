import { create } from "zustand";
import type { WorkspaceDTO } from "../domain/dtos";

interface WorkspaceState {
  currentWorkspace: WorkspaceDTO | null;
  setCurrentWorkspace: (workspace: WorkspaceDTO | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
}));
