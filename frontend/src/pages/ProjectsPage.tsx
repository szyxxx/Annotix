import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Plus, Box, Shapes } from "lucide-react";
import { api, type Project } from "../lib/api";
import { useSession } from "../lib/store";
import { Button, EmptyState, Field, Modal, Segmented, Spinner, inputClass } from "../components/ui";

export function ProjectsPage() {
  const user = useSession((s) => s.user);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => api.listProjects().then(setProjects);
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-hairline bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <span className="font-mono text-accent">[ · ]</span> Annotix
          </span>
          <span className="text-[13px] text-muted">{user?.name}</span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-[32px] font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-[14px] text-muted">
              Datasets, labels, and exports — one place per model.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} /> New project
          </Button>
        </div>

        {projects === null ? (
          <div className="flex justify-center py-20 text-muted">
            <Spinner />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            hint="A project holds one dataset and its label classes. Create one to start uploading images."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus size={15} /> New project
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>

      {creating && (
        <CreateProjectModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const pct =
    project.image_count > 0
      ? Math.round((project.annotated_count / project.image_count) * 100)
      : 0;
  const TaskIcon = project.task_type === "segment" ? Shapes : Box;
  return (
    <Link
      to={`/p/${project.id}`}
      className="group rounded-2xl border border-hairline bg-surface p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-start justify-between">
        <h2 className="text-[16px] font-semibold tracking-tight group-hover:text-accent transition-colors">
          {project.name}
        </h2>
        <span className="flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[11px] text-accent">
          <TaskIcon size={11} />
          {project.task_type}
        </span>
      </div>
      {project.description && (
        <p className="mt-1 line-clamp-2 text-[13px] text-muted">{project.description}</p>
      )}
      <div className="mt-4 flex items-center gap-4 font-mono text-[12px] text-faint">
        <span>
          <span className="text-ink">{project.image_count}</span> images
        </span>
        <span>
          <span className="text-ink">{project.label_count}</span> classes
        </span>
        <span className="ml-auto">{pct}% labeled</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<"detect" | "segment">("detect");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createProject({ name, description, task_type: taskType });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Warehouse safety"
            className={inputClass}
          />
        </Field>
        <Field label="Description (optional)">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this model should learn"
            className={inputClass}
          />
        </Field>
        <Field label="Annotation type">
          <Segmented
            options={[
              { value: "detect", label: "Bounding boxes" },
              { value: "segment", label: "Segmentation" },
            ]}
            value={taskType}
            onChange={setTaskType}
          />
        </Field>
        <p className="-mt-2 mb-4 text-[12px] text-faint">
          Sets the export format — YOLO detect or YOLO segment. Boxes can still be drawn in
          segmentation projects.
        </p>
        {error && <p className="mb-3 text-[12px] text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
