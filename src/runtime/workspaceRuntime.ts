import type { WorkspaceService } from "../application/services/WorkspaceService";
import type { CreateWorkspaceDTO, WorkspaceDTO } from "../domain/dtos";
import { mapWorkspaceToDTO } from "../domain/mappers";
import { useWorkspaceStore } from "../store/workspaceStore";
import { logger } from "../lib/logger";
import { open, save } from "@tauri-apps/plugin-dialog";

export class WorkspaceRuntime {
  constructor(private workspaceService: WorkspaceService) {}

  async create(dto?: CreateWorkspaceDTO): Promise<WorkspaceDTO | null> {
    try {
      let finalDto = dto;
      
      // If no DTO is provided, prompt the user
      if (!finalDto) {
        const selectedPath = await save({
          title: "Create Annotix Workspace",
          defaultPath: "MyWorkspace",
        });
        
        if (!selectedPath) return null; // Cancelled

        const workspaceName = selectedPath.split(/[/\\]/).pop() || "New Workspace";
        finalDto = {
          name: workspaceName,
          path: selectedPath
        };
      }

      logger.info(`Runtime: Creating workspace ${finalDto.name}`);
      const entity = await this.workspaceService.createWorkspace(finalDto);
      const dtoResult = mapWorkspaceToDTO(entity);
      
      // Update State Centrally
      useWorkspaceStore.getState().setCurrentWorkspace(dtoResult);
      return dtoResult;
    } catch (error: any) {
      logger.error(`Failed to create workspace: ${error.message}`);
      // Here we could trigger a Toast notification event
      return null;
    }
  }

  async open(path?: string): Promise<WorkspaceDTO | null> {
    try {
      let finalPath = path;

      // If no path is provided, prompt the user
      if (!finalPath) {
        const selectedPath = await open({
          title: "Open Annotix Workspace",
          directory: true, // Workspaces are directories
        });
        
        if (!selectedPath || Array.isArray(selectedPath)) return null; // Cancelled or multi-select
        finalPath = selectedPath;
      }

      logger.info(`Runtime: Opening workspace at ${finalPath}`);
      const entity = await this.workspaceService.openWorkspace(finalPath);
      if (entity) {
        const dtoResult = mapWorkspaceToDTO(entity);
        useWorkspaceStore.getState().setCurrentWorkspace(dtoResult);
        return dtoResult;
      } else {
        logger.error(`Workspace not found at ${finalPath}`);
        return null;
      }
    } catch (error: any) {
      logger.error(`Failed to open workspace: ${error.message}`);
      return null;
    }
  }
}
