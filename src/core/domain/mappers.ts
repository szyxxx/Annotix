import type { Workspace, ProjectSummary } from "./models/workspace";
import type { Project } from "./models/project";
import type { WorkspaceDTO, ProjectSummaryDTO, ProjectDTO } from "./dtos";

export const mapProjectSummaryToDTO = (entity: ProjectSummary): ProjectSummaryDTO => {
  return {
    id: entity.id,
    name: entity.name,
    path: entity.path,
    lastOpened: entity.lastOpened
  };
};

export const mapProjectToDTO = (entity: Project): ProjectDTO => {
  return {
    id: entity.id,
    name: entity.name,
    path: entity.path,
    schemaVersion: entity.schemaVersion
  };
};

export const mapWorkspaceToDTO = (entity: Workspace): WorkspaceDTO => {
  return {
    id: entity.id,
    name: entity.name,
    path: entity.path,
    projects: entity.projects.map(mapProjectSummaryToDTO)
  };
};
