import type { ProjectService } from "../application/services/ProjectService";
import type { CreateProjectDTO } from "../domain/dtos";
import { logger } from "../lib/logger";
import { useWorkspaceStore } from "../store/workspaceStore";
// import { useProjectStore } from "../store/projectStore"; // Future

export class ProjectRuntime {
  constructor(private projectService: ProjectService) {}

  async create(workspacePath: string, dto: CreateProjectDTO) {
    try {
      logger.info(`Runtime: Creating project ${dto.name}`);
      const project = await this.projectService.createProject(workspacePath, dto);
      
      // We would update ProjectStore here
      // const dtoResult = mapProjectToDTO(project);
      // useProjectStore.getState().setCurrentProject(dtoResult);
      
      return project;
    } catch (error: any) {
      logger.error(`Failed to create project: ${error.message}`);
      return null;
    }
  }

  async open(projectPath: string) {
    try {
      logger.info(`Runtime: Opening project ${projectPath}`);
      const project = await this.projectService.openProject(projectPath);
      // Let UI update
      return project;
    } catch (error: any) {
      logger.error(`Failed to open project: ${error.message}`);
      return null;
    }
  }
}
