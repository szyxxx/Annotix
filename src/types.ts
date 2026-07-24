// Annotix Native Format (ANF) and Core Types

export interface ANFLabel {
  id: string; // e.g. "cls_001"
  name: string; // e.g. "cat"
  color: string; // e.g. "#ff6600"
  shortcut: string | null;
  parent: string | null; // For hierarchical labels
}

export interface ANFObject {
  id: string; // e.g. "obj_001"
  label_id: string; // references ANFLabel.id
  bbox: [number, number, number, number]; // [xmin, ymin, xmax, ymax] (absolute pixels)
  polygon: [number, number][]; // array of [x, y] points
  mask: string | null; // rle or base64 mask
  confidence: number;
  source: string; // e.g. "YOLO11", "Human", "GroundingDINO"
  verified: boolean;
  attributes: Record<string, any>;
}

export interface ANFFile {
  image: string; // relative path e.g. "img001.jpg"
  width: number;
  height: number;
  objects: ANFObject[];
}

export interface AnnotixProject {
  id: string;
  name: string;
  path: string; // Absolute path to the "my-project" directory
  createdAt: number;
  lastOpened: number;
  classes: ANFLabel[];
}

export interface AIConfig {
  useYolo: boolean;
  useGroundingDino: boolean;
  yoloModel: string;
}

