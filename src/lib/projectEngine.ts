import { mkdir, writeTextFile, readTextFile, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { AnnotixProject, ANFFile, ANFLabel } from "../types";
import { eventBus } from "../core/eventBus";
import { logger } from "./logger";

export class ProjectEngine {
  
  static async createProject(): Promise<AnnotixProject | null> {
    const selectedPath = await save({
      title: "Create Annotix Project",
      defaultPath: "MyDataset",
      filters: []
    });

    if (!selectedPath) return null;

    logger.info(`Creating project at ${selectedPath}`);

    // Create directory structure
    await mkdir(selectedPath, { recursive: true });
    await mkdir(`${selectedPath}/dataset/images`, { recursive: true });
    await mkdir(`${selectedPath}/dataset/annotations`, { recursive: true });
    await mkdir(`${selectedPath}/exports`, { recursive: true });

    const projectName = selectedPath.split(/[/\\]/).pop() || "New Project";

    const defaultClasses: ANFLabel[] = [
      { id: "cls_1", name: "object", color: "#ff0000", shortcut: "1", parent: null }
    ];

    const project: AnnotixProject = {
      id: crypto.randomUUID(),
      name: projectName,
      path: selectedPath,
      createdAt: Date.now(),
      lastOpened: Date.now(),
      classes: defaultClasses
    };

    // Save annotix.project
    await writeTextFile(`${selectedPath}/annotix.project`, JSON.stringify(project, null, 2));
    
    eventBus.emit("Project", "Opened", project);
    return project;
  }

  static async openProject(): Promise<AnnotixProject | null> {
    const selectedPath = await open({
      title: "Open Annotix Project File",
      filters: [{ name: "Annotix Project", extensions: ["project"] }]
    });

    if (!selectedPath || Array.isArray(selectedPath)) return null;

    logger.info(`Opening project file ${selectedPath}`);

    const content = await readTextFile(selectedPath);
    const project = JSON.parse(content) as AnnotixProject;
    
    // Update lastOpened
    project.lastOpened = Date.now();
    await writeTextFile(selectedPath, JSON.stringify(project, null, 2));

    eventBus.emit("Project", "Opened", project);
    return project;
  }

  static async saveAnnotation(projectPath: string, filename: string, anfData: ANFFile) {
    const annPath = `${projectPath}/dataset/annotations/${filename}.ann.json`;
    await writeTextFile(annPath, JSON.stringify(anfData, null, 2));
    eventBus.emit("Annotation", "Changed", { image: filename });
  }

  static async loadAnnotation(projectPath: string, filename: string): Promise<ANFFile | null> {
    const annPath = `${projectPath}/dataset/annotations/${filename}.ann.json`;
    if (await exists(annPath)) {
      const content = await readTextFile(annPath);
      return JSON.parse(content) as ANFFile;
    }
    return null;
  }
}
