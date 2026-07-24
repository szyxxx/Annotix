import { container } from "../core/container";
import { WorkspaceRuntime } from "./workspaceRuntime";
import { ProjectRuntime } from "./projectRuntime";
import { DatasetRuntime } from "./datasetRuntime";
import { FeatureFlagRegistry } from "./features/featureFlags";
import { CapabilityRegistry } from "./registry/capabilityRegistry";
import { JobQueue } from "./jobs/jobQueue";
import { CommandRegistry } from "./commands/commandRegistry";
import { ShortcutRegistry } from "./commands/shortcutRegistry";
import { NotificationCenter } from "./notifications/notificationCenter";

export class ApplicationRuntime {
  public workspace: WorkspaceRuntime;
  public project: ProjectRuntime;
  public dataset: DatasetRuntime;
  
  public features: FeatureFlagRegistry;
  public capabilities: CapabilityRegistry;
  public jobs: JobQueue;
  public commands: CommandRegistry;
  public shortcuts: ShortcutRegistry;
  public notifications: NotificationCenter;

  constructor() {
    this.jobs = new JobQueue();
    this.workspace = new WorkspaceRuntime(container.resolve("WorkspaceService"));
    this.project = new ProjectRuntime(container.resolve("ProjectService"));
    this.dataset = new DatasetRuntime(container.resolve("DatasetService"), this.jobs);
    
    this.features = new FeatureFlagRegistry();
    this.capabilities = new CapabilityRegistry();
    this.commands = new CommandRegistry();
    this.shortcuts = new ShortcutRegistry();
    this.notifications = new NotificationCenter();
  }
}

// Global runtime instance
export const appRuntime = new ApplicationRuntime();
