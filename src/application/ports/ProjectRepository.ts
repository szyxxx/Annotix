import type { Project } from "../../domain/models/project";

export interface ProjectRepository {
  createProject(project: Project): Promise<void>;
  getProject(projectPath: string): Promise<Project | null>;
  updateProject(project: Project): Promise<void>;
}
