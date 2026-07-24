import { useState, useEffect } from "react";
import { X, Bot, Cpu } from "lucide-react";
import type { AIConfig } from "../../../shared/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AIConfig) => void;
}

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [useYolo, setUseYolo] = useState(true);
  const [useGroundingDino, setUseGroundingDino] = useState(true);
  const [yoloModel, setYoloModel] = useState("yolov8n.onnx");

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem("annotix_ai_config");
      if (stored) {
        try {
          const config = JSON.parse(stored) as AIConfig;
          if (config.useYolo !== undefined) setUseYolo(config.useYolo);
          if (config.useGroundingDino !== undefined) setUseGroundingDino(config.useGroundingDino);
          if (config.yoloModel) setYoloModel(config.yoloModel);
        } catch (e) {}
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    const config: AIConfig = { useYolo, useGroundingDino, yoloModel };
    localStorage.setItem("annotix_ai_config", JSON.stringify(config));
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[450px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <SettingsIcon />
            Local Models Configuration
          </h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Cpu size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">YOLO ONNX</h3>
                  <p className="text-xs text-muted-foreground">Fast local detection for standard classes.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={useYolo} onChange={(e) => setUseYolo(e.target.checked)} />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">GroundingDINO</h3>
                  <p className="text-xs text-muted-foreground">Zero-shot open-vocabulary detection.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={useGroundingDino} onChange={(e) => setUseGroundingDino(e.target.checked)} />
                <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Preferred YOLO Model</label>
            <select 
              value={yoloModel} 
              onChange={(e) => setYoloModel(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            >
              <option value="yolov8n.onnx">YOLOv8 Nano (Fastest, ~6MB)</option>
              <option value="yolov8s.onnx">YOLOv8 Small (Balanced, ~21MB)</option>
              <option value="yolo11n.onnx">YOLO11 Nano (Newest)</option>
            </select>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            All models run 100% locally on your machine via ONNX Runtime. No cloud APIs are used.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-white/5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}
