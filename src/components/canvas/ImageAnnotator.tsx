import React, { useState, useEffect, useRef } from "react";
import { MousePointer2, Square, Hand, ZoomIn, Eye, Trash2, Plus } from "lucide-react";
import FloatPanel from "../ui/FloatPanel";
import { readFile } from "@tauri-apps/plugin-fs";
import type { AnnotationClass, Region, AIConfig } from "../../types";

interface ImageAnnotatorProps {
  imageId: string | null;
  imageUrl?: string;
  imagePath?: string;
  aiConfig?: AIConfig | null;
  aiTrigger?: number;
  onAiLoadingChange?: (loading: boolean) => void;
  projectClasses?: AnnotationClass[];
  onUpdateClasses?: (classes: AnnotationClass[]) => void;
}

export default function ImageAnnotator({ 
  imageId, imageUrl, imagePath, aiConfig, aiTrigger, 
  onAiLoadingChange, projectClasses, onUpdateClasses 
}: ImageAnnotatorProps) {
  const [activeTool, setActiveTool] = useState("select"); // "select", "box", "pan"
  const [classesOpen, setClassesOpen] = useState(true);
  const [regionsOpen, setRegionsOpen] = useState(true);
  const [activeClass, setActiveClass] = useState("person");

  // State
  const [classes, setClasses] = useState<AnnotationClass[]>(projectClasses || []);
  const [newClassName, setNewClassName] = useState("");
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    if (projectClasses) {
      setClasses(projectClasses);
      if (projectClasses.length > 0 && !projectClasses.find(c => c.id === activeClass)) {
        setActiveClass(projectClasses[0].id);
      }
    }
  }, [projectClasses]);

  // Drawing state
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  // AI Assist Effect
  useEffect(() => {
    if (aiTrigger && aiTrigger > 0 && imagePath && aiConfig) {
      runAiAssist();
    }
  }, [aiTrigger]);

  const runAiAssist = async () => {
    if (!onAiLoadingChange || !aiConfig || !imagePath) return;
    try {
      onAiLoadingChange(true);
      
      // Read file bytes via Tauri
      const fileBytes = await readFile(imagePath);
      const blob = new Blob([fileBytes], { type: "image/jpeg" });
      
      const formData = new FormData();
      formData.append("file", blob, imageId || "image.jpg");
      
      const classString = classes.length > 0 ? classes.map(c => c.label).join(", ") : "objects";
      formData.append("classes", classString);
      
      formData.append("use_yolo", aiConfig.useYolo ? "true" : "false");
      formData.append("use_grounding_dino", aiConfig.useGroundingDino ? "true" : "false");
      formData.append("yolo_model", aiConfig.yoloModel || "yolov8n.onnx");

      const response = await fetch("http://127.0.0.1:8000/api/annotate/local", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      
      if (data.status === "success") {
        const newRegions = data.annotations.map((ann: any, idx: number) => {
          // Find matching class
          const matchedClass = classes.find(c => c.label.toLowerCase() === ann.label.toLowerCase());
          let classId = matchedClass ? matchedClass.id : classes[0].id; // Fallback
          
          return {
            id: `ai_${Date.now()}_${idx}`,
            classId,
            confidence: ann.confidence,
            bbox: ann.bbox_xywhn, // [x_center, y_center, width, height] normalized
            visible: true
          } as Region;
        });
        
        setRegions(prev => [...prev, ...newRegions]);
      } else {
        console.error("AI Error:", data.message);
        alert("AI Error: " + data.message);
      }
    } catch (err) {
      console.error("Failed to run AI assist:", err);
      alert("Failed to run AI assist: " + err);
    } finally {
      onAiLoadingChange(false);
    }
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const colors = ["bg-purple-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500"];
    const randomColor = colors[classes.length % colors.length];
    
    const newClass: AnnotationClass = {
      id: newClassName.toLowerCase().replace(/\s+/g, '_'),
      label: newClassName.trim(),
      color: randomColor,
      shortcut: `${classes.length + 1}`
    };
    
    const updatedClasses = [...classes, newClass];
    setClasses(updatedClasses);
    if (onUpdateClasses) onUpdateClasses(updatedClasses);
    
    setNewClassName("");
    setActiveClass(newClass.id);
  };

  const removeRegion = (id: string) => {
    setRegions(regions.filter(r => r.id !== id));
  };

  // Canvas Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== "box" || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !containerRef.current || !currentBox) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / rect.width;
    const currentY = (e.clientY - rect.top) / rect.height;
    
    setCurrentBox({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      w: Math.abs(currentX - startPos.x),
      h: Math.abs(currentY - startPos.y)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;
    
    // Only add if box is large enough
    if (currentBox.w > 0.01 && currentBox.h > 0.01) {
      const x_center = currentBox.x + (currentBox.w / 2);
      const y_center = currentBox.y + (currentBox.h / 2);
      
      const newRegion: Region = {
        id: `reg_${Date.now()}`,
        classId: activeClass,
        bbox: [x_center, y_center, currentBox.w, currentBox.h],
        visible: true
      };
      setRegions([...regions, newRegion]);
    }
    
    setIsDrawing(false);
    setCurrentBox(null);
  };

  // Convert normalized xywh to CSS percentages
  const getBoxStyle = (bbox: [number, number, number, number]) => {
    const [xc, yc, w, h] = bbox;
    return {
      left: `${(xc - w/2) * 100}%`,
      top: `${(yc - h/2) * 100}%`,
      width: `${w * 100}%`,
      height: `${h * 100}%`
    };
  };

  return (
    <div className="flex h-full w-full bg-zinc-950 relative overflow-hidden">
      
      {/* Left Toolbar */}
      <div className="w-14 bg-zinc-900 border-r border-border flex flex-col items-center py-4 gap-3 z-10">
        <ToolButton icon={<MousePointer2 size={18} />} active={activeTool === "select"} onClick={() => setActiveTool("select")} tooltip="Select Tool (V)" />
        <ToolButton icon={<Square size={18} />} active={activeTool === "box"} onClick={() => setActiveTool("box")} tooltip="Bounding Box (B)" />
        <ToolButton icon={<Hand size={18} />} active={activeTool === "pan"} onClick={() => setActiveTool("pan")} tooltip="Pan Tool (H)" />
        <div className="w-8 h-[1px] bg-border my-2" />
        <ToolButton icon={<ZoomIn size={18} />} active={false} onClick={() => {}} tooltip="Zoom" />
      </div>

      {/* Central Canvas Area */}
      <div className="flex-1 relative overflow-hidden checkered-bg flex items-center justify-center p-8">
        
        {imageUrl ? (
          <div 
            className="relative inline-block border border-white/10 shadow-2xl bg-zinc-800 transition-transform duration-300"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: activeTool === "box" ? "crosshair" : "default" }}
          >
            <img 
              src={imageUrl} 
              alt={imageId || "Image"} 
              className="max-w-full max-h-[80vh] object-contain select-none pointer-events-none rounded-md block"
              draggable={false}
            />

            {/* Render Saved Regions */}
            {regions.filter(r => r.visible).map(region => {
              const cls = classes.find(c => c.id === region.classId);
              
              // We'll map standard tailwind bg- colors to border colors dynamically via a map, or just use hardcoded style for simplicity
              // Since color is "bg-emerald-500", let's extract the hex or just use the class string carefully.
              // Safer approach: use custom inline styles if dynamic, or predefined mapping.
              
              return (
                <div 
                  key={region.id}
                  className="absolute border-2 group cursor-move bg-black/10 hover:bg-black/20 transition-colors"
                  style={{ 
                    ...getBoxStyle(region.bbox), 
                    borderColor: cls?.id === 'person' ? '#10b981' : cls?.id === 'car' ? '#3b82f6' : cls?.id === 'dog' ? '#f59e0b' : '#a855f7'
                  }}
                >
                  <div 
                    className="absolute -top-6 left-[-2px] text-black text-[10px] font-bold px-2 py-1 uppercase tracking-wider shadow-md flex items-center gap-2"
                    style={{ backgroundColor: cls?.id === 'person' ? '#10b981' : cls?.id === 'car' ? '#3b82f6' : cls?.id === 'dog' ? '#f59e0b' : '#a855f7' }}
                  >
                    <span>{cls?.label}</span>
                    {region.confidence && <span className="opacity-80">{region.confidence.toFixed(2)}</span>}
                  </div>
                </div>
              );
            })}

            {/* Render Current Drawing Box */}
            {isDrawing && currentBox && (
              <div 
                className="absolute border-2 border-white/80 border-dashed bg-white/10 pointer-events-none"
                style={{
                  left: `${currentBox.x * 100}%`,
                  top: `${currentBox.y * 100}%`,
                  width: `${currentBox.w * 100}%`,
                  height: `${currentBox.h * 100}%`
                }}
              />
            )}
          </div>
        ) : (
          <div className="w-[800px] h-[600px] flex items-center justify-center text-zinc-500">
            No Image Loaded
          </div>
        )}

        {/* Classes Panel */}
        <FloatPanel title={`Classes (${classes.length})`} isOpen={classesOpen} onToggle={() => setClassesOpen(!classesOpen)} position="top-4 right-4">
          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto mb-2">
            {classes.map(c => (
              <button 
                key={c.id}
                onClick={() => setActiveClass(c.id)}
                className={`flex items-center justify-between p-2 rounded-md text-sm font-medium transition-colors ${activeClass === c.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${c.color}`} />
                  <span>{c.label}</span>
                </div>
                <kbd className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] text-zinc-500 font-mono border border-white/5">
                  {c.shortcut}
                </kbd>
              </button>
            ))}
          </div>
          <form onSubmit={handleAddClass} className="mt-2 flex gap-2">
            <input 
              type="text" 
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Add new class..."
              className="flex-1 bg-black/20 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            />
            <button type="submit" className="bg-primary/20 text-primary hover:bg-primary/30 p-1.5 rounded-md transition-colors">
              <Plus size={14} />
            </button>
          </form>
        </FloatPanel>

        {/* Regions Panel */}
        <FloatPanel title={`Regions (${regions.length})`} isOpen={regionsOpen} onToggle={() => setRegionsOpen(!regionsOpen)} position="top-[380px] right-4">
          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
            {regions.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No regions yet.</p>
            ) : (
              regions.map((r) => {
                const cls = classes.find(c => c.id === r.classId);
                return (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/5 text-sm group">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-sm ${cls?.color || 'bg-gray-500'}`} />
                      <span className="text-zinc-300 font-medium">{cls?.label}</span>
                      {r.confidence && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded">{r.confidence.toFixed(2)}</span>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        setRegions(regions.map(reg => reg.id === r.id ? {...reg, visible: !reg.visible} : reg))
                      }} className={`p-1 rounded ${r.visible ? 'text-zinc-400 hover:text-white' : 'text-zinc-600'}`}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => removeRegion(r.id)} className="p-1 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </FloatPanel>

      </div>
    </div>
  );
}

function ToolButton({ icon, active, onClick, tooltip }: { icon: React.ReactNode, active: boolean, onClick: () => void, tooltip: string }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-2.5 rounded-lg transition-all duration-200 ${
        active 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105 border border-primary/30" 
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {icon}
    </button>
  );
}
