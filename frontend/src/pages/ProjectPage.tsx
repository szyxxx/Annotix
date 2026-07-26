import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Download, Plus, Shuffle, Trash2, Upload } from "lucide-react";
import { api, type ImageItem, type Label, type Project } from "../lib/api";
import { useSession } from "../lib/store";
import { useProjectSocket } from "../lib/ws";
import {
  Button,
  EmptyState,
  Field,
  PresenceAvatars,
  Segmented,
  Spinner,
  inputClass,
} from "../components/ui";

type Tab = "images" | "classes" | "export" | "settings";

export function ProjectPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>("images");
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    if (projectId) api.getProject(projectId).then(setProject).catch(() => setProject(null));
  }, [projectId]);
  useEffect(reload, [reload]);

  const { presence } = useProjectSocket(projectId, (ev) => {
    if (ev.type === "images_added" || ev.type === "annotations_saved") {
      setRefreshKey((k) => k + 1);
      reload();
    }
  });

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-hairline bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
          <Link
            to="/"
            className="flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink"
          >
            <ChevronLeft size={15} /> Projects
          </Link>
          <span className="text-hairline">/</span>
          <span className="text-[14px] font-semibold tracking-tight">{project.name}</span>
          <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[11px] text-accent">
            {project.task_type}
          </span>
          <div className="ml-auto">
            <PresenceAvatars users={presence} />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Segmented<Tab>
            options={[
              { value: "images", label: `Images · ${project.image_count}` },
              { value: "classes", label: `Classes · ${project.label_count}` },
              { value: "export", label: "Export" },
              { value: "settings", label: "Settings" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <span className="font-mono text-[12px] text-faint">
            {project.annotated_count}/{project.image_count} labeled
          </span>
        </div>

        {tab === "images" && (
          <ImagesTab projectId={project.id} refreshKey={refreshKey} onChanged={reload} />
        )}
        {tab === "classes" && <ClassesTab projectId={project.id} onChanged={reload} />}
        {tab === "export" && <ExportTab project={project} />}
        {tab === "settings" && <SettingsTab project={project} onChanged={reload} />}
      </main>
    </div>
  );
}

// ---------- Images ----------

const STATUS_DOT: Record<ImageItem["status"], string> = {
  unannotated: "bg-black/20",
  annotated: "bg-ok",
  review: "bg-warn",
};

function ImagesTab({
  projectId,
  refreshKey,
  onChanged,
}: {
  projectId: string;
  refreshKey: number;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageItem[] | null>(null);
  const [status, setStatus] = useState("all");
  const [split, setSplit] = useState("all");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api
      .listImages(projectId, {
        status: status === "all" ? undefined : status,
        split: split === "all" ? undefined : split,
        q: q || undefined,
      })
      .then(setImages);
  }, [projectId, status, split, q]);
  useEffect(load, [load, refreshKey]);

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await api.uploadImages(projectId, files);
      load();
      onChanged();
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    upload(Array.from(e.dataTransfer.files));
  };

  // ponytail: auto-split PATCHes one image at a time — batch endpoint when datasets get large.
  const autoSplit = async () => {
    if (!images) return;
    const shuffled = [...images].sort(() => Math.random() - 0.5);
    const cut1 = Math.round(shuffled.length * 0.7);
    const cut2 = Math.round(shuffled.length * 0.9);
    await Promise.all(
      shuffled.map((img, i) =>
        api.patchImage(img.id, { split: i < cut1 ? "train" : i < cut2 ? "val" : "test" }),
      ),
    );
    load();
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`rounded-2xl transition-shadow ${dragOver ? "ring-2 ring-accent" : ""}`}
    >
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? <Spinner /> : <Upload size={15} />} Upload images
        </Button>
        <Button variant="secondary" onClick={autoSplit} title="Reassign splits 70 / 20 / 10">
          <Shuffle size={14} /> Auto-split
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Segmented
            options={[
              { value: "all", label: "All" },
              { value: "unannotated", label: "Todo" },
              { value: "annotated", label: "Done" },
              { value: "review", label: "Review" },
            ]}
            value={status}
            onChange={setStatus}
          />
          <select
            value={split}
            onChange={(e) => setSplit(e.target.value)}
            className="rounded-lg border border-hairline bg-surface px-2 py-1.5 text-[13px]"
          >
            <option value="all">All splits</option>
            <option value="train">train</option>
            <option value="val">val</option>
            <option value="test">test</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filename"
            className="w-40 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-[13px] placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {images === null ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner />
        </div>
      ) : images.length === 0 ? (
        <EmptyState
          title={dragOver ? "Drop to upload" : "No images here"}
          hint="Drag images anywhere on this panel, or use Upload. JPEG, PNG, WebP, BMP and TIFF are supported."
          action={
            <Button onClick={() => fileInput.current?.click()}>
              <Upload size={15} /> Upload images
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map((img) => (
            <div
              key={img.id}
              className="viewfinder group cursor-pointer overflow-hidden rounded-xl border border-hairline bg-surface transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]"
              onClick={() => navigate(`/p/${projectId}/annotate/${img.id}`)}
            >
              <span className="vf" />
              <div className="aspect-square overflow-hidden bg-black/5">
                <img
                  src={img.url}
                  alt={img.filename}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[img.status]}`} />
                <span className="truncate text-[12px]" title={img.filename}>
                  {img.filename}
                </span>
                <span className="ml-auto font-mono text-[11px] text-faint">
                  {img.annotation_count}
                </span>
              </div>
              <div
                className="flex items-center justify-between border-t border-hairline px-2.5 py-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <select
                  value={img.split}
                  onChange={(e) =>
                    api.patchImage(img.id, { split: e.target.value }).then(load)
                  }
                  className="rounded bg-transparent font-mono text-[11px] text-muted"
                >
                  <option value="train">train</option>
                  <option value="val">val</option>
                  <option value="test">test</option>
                </select>
                <button
                  title="Delete image"
                  onClick={() => api.deleteImage(img.id).then(() => (load(), onChanged()))}
                  className="text-faint opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Classes ----------

function ClassesTab({ projectId, onChanged }: { projectId: string; onChanged: () => void }) {
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [newName, setNewName] = useState("");

  const load = useCallback(() => {
    api.listLabels(projectId).then(setLabels);
  }, [projectId]);
  useEffect(load, [load]);

  const add = async () => {
    if (!newName.trim()) return;
    await api.createLabel(projectId, { name: newName });
    setNewName("");
    load();
    onChanged();
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New class name, e.g. person"
          className={inputClass}
        />
        <Button onClick={add} disabled={!newName.trim()}>
          <Plus size={15} /> Add
        </Button>
      </div>

      {labels === null ? (
        <Spinner className="text-muted" />
      ) : labels.length === 0 ? (
        <EmptyState
          title="No classes yet"
          hint="Classes are the categories your model will learn. Their order here is the YOLO class index in exports. Auto-label also creates classes for anything it finds."
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-hairline bg-surface">
          {labels.map((label, i) => (
            <li
              key={label.id}
              className="group flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
            >
              <span className="w-6 text-right font-mono text-[12px] text-faint">{i}</span>
              <input
                type="color"
                value={label.color}
                onChange={(e) => api.patchLabel(label.id, { color: e.target.value }).then(load)}
                title="Class color"
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <input
                defaultValue={label.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== label.name)
                    api.patchLabel(label.id, { name }).then(() => (load(), onChanged()));
                }}
                className="flex-1 bg-transparent text-[14px] focus:outline-none"
              />
              <button
                title="Delete class and its annotations"
                onClick={() =>
                  confirm(`Delete class "${label.name}"? Its annotations are removed too.`) &&
                  api.deleteLabel(label.id).then(() => (load(), onChanged()))
                }
                className="text-faint opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Export ----------

function ExportTab({ project }: { project: Project }) {
  const formats = [
    {
      id: "yolo" as const,
      name: "YOLO",
      hint:
        project.task_type === "segment"
          ? "Normalized polygon .txt labels + data.yaml. Trains YOLOv5 through YOLO11 and YOLO26 segmentation."
          : "Normalized cx cy w h .txt labels + data.yaml. Trains YOLOv5 through YOLO11 and YOLO26 detection.",
    },
    {
      id: "coco" as const,
      name: "COCO JSON",
      hint: "_annotations.coco.json per split — for tools and frameworks that read COCO.",
    },
  ];
  return (
    <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
      {formats.map((f) => (
        <div key={f.id} className="rounded-2xl border border-hairline bg-surface p-5">
          <h3 className="font-mono text-[14px] font-semibold">{f.name}</h3>
          <p className="mt-1.5 min-h-16 text-[13px] leading-relaxed text-muted">{f.hint}</p>
          <a href={api.exportUrl(project.id, f.id)} download>
            <Button variant="secondary">
              <Download size={14} /> Download .zip
            </Button>
          </a>
        </div>
      ))}
      <p className="text-[12px] text-faint sm:col-span-2">
        Exports include every image in its split folder (train / val / test). Set splits in the
        Images tab — Auto-split assigns 70 / 20 / 10.
      </p>
    </div>
  );
}

// ---------- Settings ----------

function SettingsTab({ project, onChanged }: { project: Project; onChanged: () => void }) {
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await api.patchProject(project.id, { name, description });
    onChanged();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-md">
      <Field label="Project name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Description">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!name.trim()}>
          Save changes
        </Button>
        {saved && <span className="text-[13px] text-ok">Saved</span>}
      </div>

      <div className="mt-10 rounded-xl border border-red-200 bg-red-50/50 p-4">
        <p className="text-[13px] font-medium text-red-700">Delete this project</p>
        <p className="mb-3 mt-1 text-[12px] text-red-600/80">
          Removes the dataset, all annotations, and uploaded images. This cannot be undone.
        </p>
        <Button
          variant="danger"
          onClick={() =>
            confirm(`Delete project "${project.name}" and all its data?`) &&
            api.deleteProject(project.id).then(() => navigate("/"))
          }
        >
          <Trash2 size={14} /> Delete project
        </Button>
      </div>
      <p className="mt-6 font-mono text-[11px] text-faint">signed in as {user?.name}</p>
    </div>
  );
}
