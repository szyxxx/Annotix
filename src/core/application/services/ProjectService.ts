import type { ProjectRepository } from "../ports/ProjectRepository";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";
import type { CreateProjectDTO } from "../../domain/dtos";
import type { Project } from "../../domain/models/project";
import { eventBus } from "../../../shared/core/eventBus";

export class ProjectService {
  constructor(
    private projectRepo: ProjectRepository,
    private workspaceRepo: WorkspaceRepository
  ) {}

  async createProject(workspacePath: string, dto: CreateProjectDTO): Promise<Project> {
    const project: Project = {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      name: dto.name,
      path: `${workspacePath}/projects/${dto.name}`,
      createdAt: Date.now(),
      dataset: { classes: [] },
      history: {},
      settings: {}
    };

    await this.projectRepo.createProject(project);
    
    // Update Workspace
    const workspace = await this.workspaceRepo.getWorkspace(workspacePath);
    if (workspace) {
      workspace.projects.push({
        id: project.id,
        name: project.name,
        path: project.path,
        lastOpened: Date.now()
      });
      await this.workspaceRepo.updateWorkspace(workspace);
    }

    eventBus.emit("Project", "Loaded", project);
    return project;
  }
  async openProject(projectPath: string): Promise<Project> {
    const project = await this.projectRepo.getProject(projectPath);
    if (!project) throw new Error("Project not found");
    eventBus.emit("Project", "Loaded", project);
    return project;
  }
}
