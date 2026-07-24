import { TauriStorageProvider } from "../../core/infrastructure/adapters/TauriStorageProvider";
import { TauriWorkspaceRepository } from "../../core/infrastructure/adapters/TauriWorkspaceRepository";
import { TauriProjectRepository } from "../../core/infrastructure/adapters/TauriProjectRepository";
import { TauriAssetRepository } from "../../core/infrastructure/adapters/TauriAssetRepository";
import { WorkspaceService } from "../../core/application/services/WorkspaceService";
import { ProjectService } from "../../core/application/services/ProjectService";
import { DatasetService } from "../../core/application/services/DatasetService";
export class ServiceContainer {
  private instances = new Map<string, any>();
  private factories = new Map<string, () => any>();

  registerSingleton<T>(token: string, instance: T) {
    this.instances.set(token, instance);
  }

  registerFactory<T>(token: string, factory: () => T) {
    this.factories.set(token, factory);
  }

  resolve<T>(token: string): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    if (this.factories.has(token)) {
      const instance = this.factories.get(token)!();
      this.instances.set(token, instance);
      return instance as T;
    }

    throw new Error(`Service not found for token: ${token}`);
  }
}

// Global container instance
export const container = new ServiceContainer();

// Register Ports & Adapters for Workspace Platform
const storageProvider = new TauriStorageProvider();
const workspaceRepo = new TauriWorkspaceRepository(storageProvider);
const projectRepo = new TauriProjectRepository(storageProvider);
const assetRepo = new TauriAssetRepository(storageProvider);

container.registerSingleton("StorageProvider", storageProvider);
container.registerSingleton("WorkspaceRepository", workspaceRepo);
container.registerSingleton("ProjectRepository", projectRepo);
container.registerSingleton("AssetRepository", assetRepo);

// Register Application Services
container.registerSingleton("WorkspaceService", new WorkspaceService(workspaceRepo));
container.registerSingleton("ProjectService", new ProjectService(projectRepo, workspaceRepo));
container.registerSingleton("DatasetService", new DatasetService(assetRepo, storageProvider));
