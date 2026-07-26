export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  task_type: "detect" | "segment";
  created_at: number;
  updated_at: number;
  image_count: number;
  annotated_count: number;
  label_count: number;
}

export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
  idx: number;
}

export interface ImageItem {
  id: string;
  project_id: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  size_bytes: number;
  split: "train" | "val" | "test";
  status: "unannotated" | "annotated" | "review";
  created_at: number;
  annotation_count: number;
}

export interface Annotation {
  id?: string;
  label_id: string;
  kind: "bbox" | "polygon";
  points: number[];
  created_by?: string | null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = (await res.json()).error ?? message;
    } catch {
      /* keep statusText */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  createUser: (name: string) => request<User>("/api/users", json("POST", { name })),

  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (body: { name: string; description: string; task_type: string }) =>
    request<Project>("/api/projects", json("POST", body)),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  patchProject: (id: string, body: { name?: string; description?: string }) =>
    request<Project>(`/api/projects/${id}`, json("PATCH", body)),
  deleteProject: (id: string) => request<void>(`/api/projects/${id}`, { method: "DELETE" }),

  listLabels: (projectId: string) => request<Label[]>(`/api/projects/${projectId}/labels`),
  createLabel: (projectId: string, body: { name: string; color?: string }) =>
    request<Label>(`/api/projects/${projectId}/labels`, json("POST", body)),
  patchLabel: (id: string, body: { name?: string; color?: string }) =>
    request<void>(`/api/labels/${id}`, json("PATCH", body)),
  deleteLabel: (id: string) => request<void>(`/api/labels/${id}`, { method: "DELETE" }),

  listImages: (projectId: string, filters: { split?: string; status?: string; q?: string } = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v) as [string, string][],
    );
    const qs = params.toString();
    return request<ImageItem[]>(`/api/projects/${projectId}/images${qs ? `?${qs}` : ""}`);
  },
  uploadImages: (projectId: string, files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return request<ImageItem[]>(`/api/projects/${projectId}/images`, { method: "POST", body: form });
  },
  getImage: (id: string) => request<ImageItem>(`/api/images/${id}`),
  patchImage: (id: string, body: { split?: string; status?: string }) =>
    request<ImageItem>(`/api/images/${id}`, json("PATCH", body)),
  deleteImage: (id: string) => request<void>(`/api/images/${id}`, { method: "DELETE" }),

  getAnnotations: (imageId: string) => request<Annotation[]>(`/api/images/${imageId}/annotations`),
  saveAnnotations: (imageId: string, annotations: Annotation[], userId?: string) =>
    request<Annotation[]>(
      `/api/images/${imageId}/annotations`,
      json("PUT", { annotations, user_id: userId }),
    ),
  autolabel: (imageId: string, userId?: string) =>
    request<{ annotations: Annotation[]; labels: Label[]; added: number }>(
      `/api/images/${imageId}/autolabel`,
      json("POST", { user_id: userId }),
    ),

  exportUrl: (projectId: string, format: "yolo" | "coco") =>
    `/api/projects/${projectId}/export?format=${format}`,
};
