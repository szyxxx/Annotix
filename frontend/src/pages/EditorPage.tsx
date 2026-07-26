import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BoxSelect,
  ChevronLeft,
  ChevronRight,
  Hand,
  MousePointer2,
  Pentagon,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api, type Annotation, type ImageItem, type Label, type Project } from "../lib/api";
import { useSession } from "../lib/store";
import { useProjectSocket } from "../lib/ws";
import { Button, ClassChip, PresenceAvatars, Spinner } from "../components/ui";

type Tool = "select" | "bbox" | "polygon" | "pan";
type View = { x: number; y: number; scale: number };

const HIT = 8; // px hit radius (screen space) for vertices / polygon closing

export function EditorPage() {
  const { projectId, imageId } = useParams();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);

  const [project, setProject] = useState<Project | null>(null);
  const [image, setImage] = useState<ImageItem | null>(null);
  const [siblings, setSiblings] = useState<ImageItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [anns, setAnns] = useState<Annotation[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [error, setError] = useState("");

  const [tool, setTool] = useState<Tool>("bbox");
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [newClass, setNewClass] = useState("");

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const annsRef = useRef(anns);
  annsRef.current = anns;

  // ---- data loading ----
  useEffect(() => {
    if (!projectId) return;
    api.getProject(projectId).then(setProject);
    api.listImages(projectId).then(setSiblings);
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !imageId) return;
    setSelected(null);
    setDirty(false);
    api.getImage(imageId).then(setImage);
    api.getAnnotations(imageId).then(setAnns);
    api.listLabels(projectId).then((ls) => {
      setLabels(ls);
      setActiveLabelId((cur) => cur ?? ls[0]?.id ?? null);
    });
  }, [projectId, imageId]);

  const { presence, send } = useProjectSocket(projectId, (ev) => {
    if (
      ev.type === "annotations_saved" &&
      ev.image_id === imageId &&
      (ev.user as { id?: string } | undefined)?.id !== user?.id &&
      !dirtyRef.current
    ) {
      api.getAnnotations(imageId!).then(setAnns);
      api.listLabels(projectId!).then(setLabels);
    }
  });
  useEffect(() => {
    if (imageId) send({ type: "editing", image_id: imageId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  const labelById = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);
  const orderIndex = useMemo(() => new Map(labels.map((l, i) => [l.id, i])), [labels]);

  // ---- actions ----
  const save = useCallback(async () => {
    if (!imageId) return;
    setSaving(true);
    setError("");
    try {
      const saved = await api.saveAnnotations(imageId, annsRef.current, user?.id);
      setAnns(saved);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [imageId, user?.id]);

  const autolabel = useCallback(async () => {
    if (!imageId) return;
    setAutoBusy(true);
    setError("");
    try {
      if (dirtyRef.current) await save();
      const res = await api.autolabel(imageId, user?.id);
      setAnns(res.annotations);
      setLabels(res.labels);
      setActiveLabelId((cur) => cur ?? res.labels[0]?.id ?? null);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-label failed");
    } finally {
      setAutoBusy(false);
    }
  }, [imageId, save, user?.id]);

  const idx = siblings.findIndex((s) => s.id === imageId);
  const goto = useCallback(
    async (offset: number) => {
      const target = siblings[idx + offset];
      if (!target) return;
      if (dirtyRef.current) await save();
      navigate(`/p/${projectId}/annotate/${target.id}`);
    },
    [siblings, idx, navigate, projectId, save],
  );

  const updateAnn = (i: number, points: number[]) => {
    setAnns((a) => a.map((ann, j) => (j === i ? { ...ann, points } : ann)));
    setDirty(true);
  };
  const addAnn = (ann: Annotation) => {
    setAnns((a) => [...a, ann]);
    setSelected(anns.length);
    setDirty(true);
  };
  const deleteAnn = (i: number) => {
    setAnns((a) => a.filter((_, j) => j !== i));
    setSelected(null);
    setDirty(true);
  };
  const addClass = async () => {
    if (!newClass.trim() || !projectId) return;
    const label = await api.createLabel(projectId, { name: newClass });
    setLabels((ls) => [...ls, label]);
    setActiveLabelId(label.id);
    setNewClass("");
  };

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
        return;
      }
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= 9 && labels[digit - 1]) {
        setActiveLabelId(labels[digit - 1].id);
        return;
      }
      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "b":
          setTool("bbox");
          break;
        case "p":
          setTool("polygon");
          break;
        case "h":
          setTool("pan");
          break;
        case "a":
          autolabel();
          break;
        case "delete":
        case "backspace":
          if (selected !== null) deleteAnn(selected);
          break;
        case "arrowleft":
          goto(-1);
          break;
        case "arrowright":
          goto(1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [labels, selected, save, autolabel, goto]);

  if (!image || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-studio text-studio-muted">
        <Spinner />
      </div>
    );
  }

  const activeLabel = activeLabelId ? labelById.get(activeLabelId) : undefined;
  const canDraw = labels.length > 0 && !!activeLabel;

  return (
    <div className="flex h-screen flex-col bg-studio text-studio-ink">
      {/* top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-studio-line px-3">
        <Link
          to={`/p/${projectId}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-studio-muted transition-colors hover:text-studio-ink"
        >
          <ChevronLeft size={15} /> Dataset
        </Link>
        <span className="truncate text-[13px] font-medium">{image.filename}</span>
        <span className="font-mono text-[11px] text-studio-muted">
          {image.width}×{image.height} · {image.split}
        </span>
        {error && <span className="truncate text-[12px] text-red-400">{error}</span>}
        <div className="ml-auto flex items-center gap-2">
          <PresenceAvatars users={presence} dark />
          <Button variant="studio" onClick={autolabel} disabled={autoBusy} title="Auto-label (A)">
            {autoBusy ? <Spinner /> : <Sparkles size={14} className="text-accent" />}
            Auto-label
          </Button>
          <Button onClick={save} disabled={saving || !dirty} title="Save (Ctrl+S)">
            {saving ? <Spinner /> : dirty ? "Save" : "Saved"}
          </Button>
          <div className="flex items-center gap-1 pl-2">
            <button
              onClick={() => goto(-1)}
              disabled={idx <= 0}
              className="rounded-md p-1.5 text-studio-muted transition-colors hover:bg-white/5 hover:text-studio-ink disabled:opacity-30"
              title="Previous image (←)"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-mono text-[11px] text-studio-muted">
              {idx + 1} / {siblings.length}
            </span>
            <button
              onClick={() => goto(1)}
              disabled={idx < 0 || idx >= siblings.length - 1}
              className="rounded-md p-1.5 text-studio-muted transition-colors hover:bg-white/5 hover:text-studio-ink disabled:opacity-30"
              title="Next image (→)"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* tool rail */}
        <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-studio-line py-3">
          {(
            [
              { id: "select", icon: MousePointer2, key: "V", label: "Select" },
              { id: "bbox", icon: BoxSelect, key: "B", label: "Bounding box" },
              { id: "polygon", icon: Pentagon, key: "P", label: "Polygon" },
              { id: "pan", icon: Hand, key: "H", label: "Pan" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.key})`}
              className={`rounded-lg p-2 transition-colors ${
                tool === t.id
                  ? "bg-accent text-white"
                  : "text-studio-muted hover:bg-white/5 hover:text-studio-ink"
              }`}
            >
              <t.icon size={17} />
            </button>
          ))}
        </aside>

        {/* canvas */}
        <Canvas
          image={image}
          anns={anns}
          labelById={labelById}
          tool={tool}
          canDraw={canDraw}
          activeLabelId={activeLabelId}
          selected={selected}
          setSelected={setSelected}
          addAnn={addAnn}
          updateAnn={updateAnn}
        />

        {/* right panel */}
        <aside className="flex w-64 shrink-0 flex-col border-l border-studio-line">
          <section className="border-b border-studio-line p-3">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-studio-muted">
              Classes
            </h3>
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {labels.map((label, i) => (
                <button
                  key={label.id}
                  onClick={() => setActiveLabelId(label.id)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    activeLabelId === label.id ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: label.color }} />
                  <span className="flex-1 truncate text-[13px]">{label.name}</span>
                  <span className="font-mono text-[10px] text-studio-muted">
                    {i < 9 ? i + 1 : ""}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              <input
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addClass()}
                placeholder={labels.length === 0 ? "Add a class to start" : "Add class"}
                className="w-full rounded-lg border border-studio-line bg-studio-panel px-2 py-1.5 text-[12px] placeholder:text-studio-muted focus:border-accent focus:outline-none"
              />
              <button
                onClick={addClass}
                disabled={!newClass.trim()}
                className="rounded-lg border border-studio-line px-2 text-studio-muted transition-colors hover:text-studio-ink disabled:opacity-30"
              >
                <Plus size={14} />
              </button>
            </div>
          </section>

          <section className="min-h-0 flex-1 overflow-y-auto p-3">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-studio-muted">
              Annotations · {anns.length}
            </h3>
            {anns.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-studio-muted">
                {canDraw
                  ? "Draw with the box or polygon tool, or press A to auto-label with the baseline model."
                  : "Add a class first — every annotation needs one."}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {anns.map((ann, i) => {
                  const label = labelById.get(ann.label_id);
                  return (
                    <li
                      key={ann.id ?? `new-${i}`}
                      onClick={() => setSelected(i)}
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                        selected === i ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <ClassChip
                        idx={orderIndex.get(ann.label_id) ?? 0}
                        name={label?.name ?? "?"}
                        color={label?.color ?? "#888"}
                        dark
                      />
                      <span className="ml-auto font-mono text-[10px] text-studio-muted">
                        {ann.kind === "bbox" ? "box" : `poly·${ann.points.length / 2}`}
                      </span>
                      <button
                        title="Delete annotation"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAnn(i);
                        }}
                        className="text-studio-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <footer className="border-t border-studio-line p-3 font-mono text-[10px] leading-relaxed text-studio-muted">
            B box · P polygon · V select · H pan
            <br />
            1–9 class · A auto-label · ⌫ delete
            <br />
            ←/→ image · Ctrl+S save · scroll zoom
          </footer>
        </aside>
      </div>
    </div>
  );
}

// ---------------- canvas ----------------

function Canvas({
  image,
  anns,
  labelById,
  tool,
  canDraw,
  activeLabelId,
  selected,
  setSelected,
  addAnn,
  updateAnn,
}: {
  image: ImageItem;
  anns: Annotation[];
  labelById: Map<string, Label>;
  tool: Tool;
  canDraw: boolean;
  activeLabelId: string | null;
  selected: number | null;
  setSelected: (i: number | null) => void;
  addAnn: (ann: Annotation) => void;
  updateAnn: (i: number, points: number[]) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [boxDraft, setBoxDraft] = useState<{ sx: number; sy: number; x: number; y: number } | null>(null);
  const [polyDraft, setPolyDraft] = useState<number[]>([]);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const drag = useRef<
    | { mode: "pan"; startX: number; startY: number; vx: number; vy: number }
    | { mode: "move"; i: number; startX: number; startY: number; points: number[] }
    | { mode: "resize"; i: number; corner: number; points: number[] }
    | { mode: "vertex"; i: number; vi: number }
    | null
  >(null);

  // fit image on load / image change
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const scale = Math.min(el.clientWidth / image.width, el.clientHeight / image.height) * 0.92;
    setView({
      x: (el.clientWidth - image.width * scale) / 2,
      y: (el.clientHeight - image.height * scale) / 2,
      scale,
    });
    setBoxDraft(null);
    setPolyDraft([]);
  }, [image.id, image.width, image.height]);

  // space = temporary pan; esc/enter finish drafts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === " ") {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "Escape") setPolyDraft([]), setBoxDraft(null);
      if (e.key === "Enter" && polyDraft.length >= 6 && activeLabelId) {
        addAnn({ label_id: activeLabelId, kind: "polygon", points: polyDraft });
        setPolyDraft([]);
      }
    };
    const up = (e: KeyboardEvent) => e.key === " " && setSpaceHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [polyDraft, activeLabelId, addAnn]);

  const toImg = (e: { clientX: number; clientY: number }) => {
    const rect = wrap.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - view.x) / view.scale,
      y: (e.clientY - rect.top - view.y) / view.scale,
    };
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = wrap.current!.getBoundingClientRect();
    const factor = Math.pow(1.0015, -e.deltaY);
    const scale = Math.min(40, Math.max(0.05, view.scale * factor));
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setView({
      scale,
      x: mx - ((mx - view.x) / view.scale) * scale,
      y: my - ((my - view.y) / view.scale) * scale,
    });
  };

  const panning = tool === "pan" || spaceHeld;

  const onMouseDown = (e: React.MouseEvent) => {
    const pt = toImg(e);
    if (e.button === 1 || panning) {
      drag.current = { mode: "pan", startX: e.clientX, startY: e.clientY, vx: view.x, vy: view.y };
      return;
    }
    if (e.button !== 0) return;
    if (tool === "bbox" && canDraw) {
      setBoxDraft({ sx: pt.x, sy: pt.y, x: pt.x, y: pt.y });
    } else if (tool === "polygon" && canDraw) {
      if (polyDraft.length >= 6) {
        const dx = (polyDraft[0] - pt.x) * view.scale;
        const dy = (polyDraft[1] - pt.y) * view.scale;
        if (Math.hypot(dx, dy) < HIT && activeLabelId) {
          addAnn({ label_id: activeLabelId, kind: "polygon", points: polyDraft });
          setPolyDraft([]);
          return;
        }
      }
      setPolyDraft((p) => [...p, pt.x, pt.y]);
    } else if (tool === "select") {
      setSelected(null);
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const pt = toImg(e);
    setCursor(pt);
    const d = drag.current;
    if (!d) {
      if (boxDraft) setBoxDraft({ ...boxDraft, x: pt.x, y: pt.y });
      return;
    }
    if (d.mode === "pan") {
      setView((v) => ({ ...v, x: d.vx + e.clientX - d.startX, y: d.vy + e.clientY - d.startY }));
    } else if (d.mode === "move") {
      const dx = pt.x - d.startX;
      const dy = pt.y - d.startY;
      updateAnn(d.i, d.points.map((v, j) => (j % 2 === 0 ? v + dx : v + dy)));
    } else if (d.mode === "resize") {
      const [x, y, w, h] = d.points;
      const x2 = x + w;
      const y2 = y + h;
      const c = d.corner; // 0 tl, 1 tr, 2 br, 3 bl
      const nx1 = c === 0 || c === 3 ? pt.x : x;
      const ny1 = c === 0 || c === 1 ? pt.y : y;
      const nx2 = c === 1 || c === 2 ? pt.x : x2;
      const ny2 = c === 2 || c === 3 ? pt.y : y2;
      updateAnn(d.i, [
        Math.min(nx1, nx2),
        Math.min(ny1, ny2),
        Math.abs(nx2 - nx1),
        Math.abs(ny2 - ny1),
      ]);
    } else if (d.mode === "vertex") {
      const points = [...anns[d.i].points];
      points[d.vi * 2] = pt.x;
      points[d.vi * 2 + 1] = pt.y;
      updateAnn(d.i, points);
    }
  };

  const onMouseUp = () => {
    if (boxDraft && activeLabelId) {
      const x = Math.min(boxDraft.sx, boxDraft.x);
      const y = Math.min(boxDraft.sy, boxDraft.y);
      const w = Math.abs(boxDraft.x - boxDraft.sx);
      const h = Math.abs(boxDraft.y - boxDraft.sy);
      if (w > 3 && h > 3) addAnn({ label_id: activeLabelId, kind: "bbox", points: [x, y, w, h] });
      setBoxDraft(null);
    }
    drag.current = null;
  };

  const onDblClick = () => {
    if (tool === "polygon" && polyDraft.length >= 6 && activeLabelId) {
      addAnn({ label_id: activeLabelId, kind: "polygon", points: polyDraft });
      setPolyDraft([]);
    }
  };

  const s = view.scale;
  const px = (n: number) => n / s; // keep strokes/handles constant on screen
  const crosshair = (tool === "bbox" || tool === "polygon") && canDraw && cursor && !panning;

  return (
    <div
      ref={wrap}
      className="relative min-w-0 flex-1 overflow-hidden bg-studio"
      style={{ cursor: panning ? "grab" : tool === "select" ? "default" : "crosshair" }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => {
        setCursor(null);
        onMouseUp();
      }}
      onDoubleClick={onDblClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className="h-full w-full select-none">
        <g transform={`translate(${view.x} ${view.y}) scale(${s})`}>
          <image
            href={image.url}
            width={image.width}
            height={image.height}
            preserveAspectRatio="none"
          />
          <rect
            x={0}
            y={0}
            width={image.width}
            height={image.height}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={px(1)}
          />

          {/* annotations */}
          {anns.map((ann, i) => {
            const label = labelById.get(ann.label_id);
            const color = label?.color ?? "#888";
            const isSel = selected === i;
            const common = {
              fill: `${color}2b`,
              stroke: color,
              strokeWidth: px(isSel ? 2.5 : 1.75),
              style: { cursor: tool === "select" ? "move" : undefined },
              onMouseDown: (e: React.MouseEvent) => {
                if (tool !== "select" || e.button !== 0) return;
                e.stopPropagation();
                setSelected(i);
                const pt = toImg(e);
                drag.current = {
                  mode: "move",
                  i,
                  startX: pt.x,
                  startY: pt.y,
                  points: [...ann.points],
                };
              },
            };
            return (
              <g key={ann.id ?? `n${i}`}>
                {ann.kind === "bbox" ? (
                  <rect
                    x={ann.points[0]}
                    y={ann.points[1]}
                    width={ann.points[2]}
                    height={ann.points[3]}
                    {...common}
                  />
                ) : (
                  <polygon
                    points={ann.points
                      .reduce<string[]>((acc, v, j) => {
                        if (j % 2 === 0) acc.push(`${v},${ann.points[j + 1]}`);
                        return acc;
                      }, [])
                      .join(" ")}
                    {...common}
                  />
                )}
                {/* handles */}
                {isSel &&
                  tool === "select" &&
                  (ann.kind === "bbox"
                    ? [0, 1, 2, 3].map((corner) => {
                        const [x, y, w, h] = ann.points;
                        const hx = corner === 1 || corner === 2 ? x + w : x;
                        const hy = corner === 2 || corner === 3 ? y + h : y;
                        return (
                          <rect
                            key={corner}
                            x={hx - px(4)}
                            y={hy - px(4)}
                            width={px(8)}
                            height={px(8)}
                            fill="#fff"
                            stroke={color}
                            strokeWidth={px(1.5)}
                            style={{ cursor: "nwse-resize" }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              drag.current = { mode: "resize", i, corner, points: [...ann.points] };
                            }}
                          />
                        );
                      })
                    : ann.points.map((_, j) =>
                        j % 2 === 0 ? (
                          <circle
                            key={j}
                            cx={ann.points[j]}
                            cy={ann.points[j + 1]}
                            r={px(4)}
                            fill="#fff"
                            stroke={color}
                            strokeWidth={px(1.5)}
                            style={{ cursor: "move" }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              drag.current = { mode: "vertex", i, vi: j / 2 };
                            }}
                          />
                        ) : null,
                      ))}
              </g>
            );
          })}

          {/* bbox draft */}
          {boxDraft && (
            <rect
              x={Math.min(boxDraft.sx, boxDraft.x)}
              y={Math.min(boxDraft.sy, boxDraft.y)}
              width={Math.abs(boxDraft.x - boxDraft.sx)}
              height={Math.abs(boxDraft.y - boxDraft.sy)}
              fill="rgba(99,91,255,0.12)"
              stroke="#635bff"
              strokeWidth={px(1.5)}
              strokeDasharray={`${px(5)} ${px(4)}`}
            />
          )}

          {/* polygon draft */}
          {polyDraft.length > 0 && (
            <g>
              <polyline
                points={
                  polyDraft
                    .reduce<string[]>((acc, v, j) => {
                      if (j % 2 === 0) acc.push(`${v},${polyDraft[j + 1]}`);
                      return acc;
                    }, [])
                    .join(" ") + (cursor ? ` ${cursor.x},${cursor.y}` : "")
                }
                fill="rgba(99,91,255,0.1)"
                stroke="#635bff"
                strokeWidth={px(1.5)}
              />
              <circle
                cx={polyDraft[0]}
                cy={polyDraft[1]}
                r={px(5)}
                fill={polyDraft.length >= 6 ? "#635bff" : "#fff"}
                stroke="#635bff"
                strokeWidth={px(1.5)}
              />
            </g>
          )}

          {/* reticle crosshair */}
          {crosshair && cursor && (
            <g stroke="rgba(99,91,255,0.55)" strokeWidth={px(1)}>
              <line x1={cursor.x} y1={0} x2={cursor.x} y2={image.height} />
              <line x1={0} y1={cursor.y} x2={image.width} y2={cursor.y} />
            </g>
          )}
        </g>
      </svg>

      {/* zoom readout */}
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-1 font-mono text-[11px] text-studio-muted">
        {Math.round(s * 100)}%
        {cursor && ` · ${Math.round(cursor.x)},${Math.round(cursor.y)}`}
      </span>
    </div>
  );
}
