import type { Project } from "../../domain/models/project";
import type { ProjectRepository } from "../../application/ports/ProjectRepository";
import type { StorageProvider } from "../../application/ports/StorageProvider";

export class TauriProjectRepository implements ProjectRepository {
  constructor(private storage: StorageProvider) {}

  private getProjectFilePath(projectPath: string): string {
    return `${projectPath}/project.annotix`;
  }

  async createProject(project: Project): Promise<void> {
    const dir = project.path;
    await this.storage.createDir(dir, true);
    await this.storage.createDir(`${dir}/dataset/images`, true);
    await this.storage.createDir(`${dir}/dataset/annotations`, true);
    await this.storage.createDir(`${dir}/exports`, true);
    await this.storage.createDir(`${dir}/models`, true);
    
    await this.updateProject(project);
  }

  async getProject(projectPath: string): Promise<Project | null> {
    const file = this.getProjectFilePath(projectPath);
    if (!(await this.storage.exists(file))) {
      return null;
    }
    const content = await this.storage.readText(file);
    return JSON.parse(content) as Project;
  }

  async updateProject(project: Project): Promise<void> {
    const file = this.getProjectFilePath(project.path);
    await this.storage.writeText(file, JSON.stringify(project, null, 2));
  }
}
