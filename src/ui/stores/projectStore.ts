import { create } from "zustand";
import type { ProjectDTO } from "../../core/domain/dtos";

// The AssetDTO matches the Asset entity but is kept separate in UI space
export interface AssetDTO {
  id: string;
  path: string;
  filename: string;
  extension: string;
  status: string;
  width: number;
  height: number;
  size: number;
  mime?: string;
  hash?: string;
  thumbnailPath?: string;
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
  updateAsset: (asset: AssetDTO) => void;
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
  updateAsset: (updatedAsset) => set((state) => {
    const exists = state.assets.find(a => a.id === updatedAsset.id);
    if (exists) {
      return { assets: state.assets.map(a => a.id === updatedAsset.id ? updatedAsset : a) };
    } else {
      return { assets: [...state.assets, updatedAsset] };
    }
  }),
  setImportProgress: (isImporting, progress = 0, currentFile = "") => set({ 
    importProgress: { isImporting, progress, currentFile } 
  })
}));
