import { create } from "zustand";
import type { ProjectDTO } from "../domain/dtos";

// The AssetDTO matches the Asset entity but is kept separate in UI space
export interface AssetDTO {
  id: string;
  path: string;
  filename: string;
  extension: string;
  width: number;
  height: number;
  size: number;
  createdAt: number;
}

interface ProjectState {
  activeProject: ProjectDTO | null;
  assets: AssetDTO[];
  importProgress: {
    isImporting: boolean;
    progress: number;
    currentFile: string;
  };
  
  setActiveProject: (project: ProjectDTO) => void;
  setAssets: (assets: AssetDTO[]) => void;
  setImportProgress: (isImporting: boolean, progress?: number, currentFile?: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProject: null,
  assets: [],
  importProgress: {
    isImporting: false,
    progress: 0,
    currentFile: ""
  },
  
  setActiveProject: (project) => set({ activeProject: project }),
  setAssets: (assets) => set({ assets }),
  setImportProgress: (isImporting, progress = 0, currentFile = "") => set({ 
    importProgress: { isImporting, progress, currentFile } 
  })
}));
