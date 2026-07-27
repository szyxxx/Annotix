import { useState } from "react";
import { Button, Field, Segmented, inputClass } from "./ui";

interface TrainingWizardProps {
  onStart: (config: any) => void;
  disabled?: boolean;
}

const DEFAULT_CONFIG = {
  yolo_version: "yolo11",
  target_deployment: "nano",
  epochs: 50,
  batch_size: 16,
  imgsz: 640,
  patience: 50,
  
  optimizer: "auto",
  lr0: 0.01,
  lrf: 0.01,
  momentum: 0.937,
  weight_decay: 0.0005,
  warmup_epochs: 3.0,
  warmup_momentum: 0.8,
  warmup_bias_lr: 0.1,
  box: 7.5,
  cls: 0.5,
  dfl: 1.5,
  
  hsv_h: 0.015,
  hsv_s: 0.7,
  hsv_v: 0.4,
  bgr: 0.0,
  
  degrees: 0.0,
  translate: 0.1,
  scale: 0.5,
  shear: 0.0,
  perspective: 0.0,
  flipud: 0.0,
  fliplr: 0.5,
  
  mosaic: 1.0,
  mixup: 0.0,
  copy_paste: 0.0,
  erasing: 0.4,
  crop_fraction: 1.0,
};

const PRESETS = {
  fast: { epochs: 10, batch_size: 16, imgsz: 640 },
  balanced: { epochs: 50, batch_size: 16, imgsz: 640 },
  accurate: { epochs: 100, batch_size: 8, imgsz: 1280 },
  custom: {},
};

export function TrainingWizard({ onStart, disabled }: TrainingWizardProps) {
  const [preset, setPreset] = useState<"fast" | "balanced" | "accurate" | "custom">("balanced");
  const [c, setC] = useState({ ...DEFAULT_CONFIG });
  
  const applyPreset = (p: keyof typeof PRESETS) => {
    setPreset(p);
    if (p !== "custom") {
      setC({ ...c, ...PRESETS[p] });
    }
  };

  const update = (key: keyof typeof DEFAULT_CONFIG, val: any) => {
    setC(prev => ({ ...prev, [key]: val }));
  };

  const numInput = (key: keyof typeof DEFAULT_CONFIG, label: string, step: string = "any") => (
    <Field label={label}>
      <input 
        type="number" 
        step={step}
        value={c[key]} 
        onChange={e => update(key, Number(e.target.value))} 
        className={inputClass} 
      />
    </Field>
  );

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h3 className="mb-4 text-[16px] font-semibold">Train YOLO Model</h3>
      
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">YOLO Architecture Version</label>
          <p className="mb-2 text-[12px] text-muted">Select the underlying model version.</p>
          <select 
            value={c.yolo_version} 
            onChange={e => update("yolo_version", e.target.value)} 
            className={inputClass}
          >
            <option value="yolov5">YOLOv5</option>
            <option value="yolov8">YOLOv8</option>
            <option value="yolov9">YOLOv9</option>
            <option value="yolov10">YOLOv10</option>
            <option value="yolo11">YOLO11 (Recommended)</option>
            <option value="yolov12">YOLOv12</option>
            <option value="yolov26">YOLOv26</option>
          </select>
        </div>
        
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Target Deployment (Model Scale)</label>
          <p className="mb-2 text-[12px] text-muted">Larger models are more accurate but slower.</p>
          <div className="flex flex-wrap gap-2">
            {["nano", "small", "medium", "large", "xlarge"].map(size => (
              <button
                key={size}
                onClick={() => update("target_deployment", size)}
                className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  c.target_deployment === size 
                    ? "border-accent bg-accent/10 text-accent" 
                    : "border-hairline hover:bg-black/5"
                }`}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
        
      <div className="mb-6">
        <label className="mb-1.5 block text-[13px] font-medium text-ink">Training Preset</label>
        <p className="mb-2 text-[12px] text-muted">Optimize core parameters for speed vs accuracy.</p>
        <Segmented
          options={[
            { value: "fast", label: "Fast" },
            { value: "balanced", label: "Balanced" },
            { value: "accurate", label: "Accurate" },
            { value: "custom", label: "Custom" },
          ]}
          value={preset}
          onChange={(v) => applyPreset(v as any)}
        />
      </div>
      
      {/* Basic Configuration */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {numInput("epochs", "Epochs", "1")}
        {numInput("batch_size", "Batch Size", "1")}
        {numInput("imgsz", "Image Size", "32")}
        {numInput("patience", "Patience", "1")}
      </div>

      {preset === "custom" && (
        <>
          {/* Advanced Hyperparameters */}
          <div className="mb-6 border-t border-hairline pt-4">
            <h3 className="mb-4 text-[13px] font-semibold text-ink">Advanced Hyperparameters</h3>
            <div className="mt-4 grid gap-4 rounded-xl bg-black/5 p-4 sm:grid-cols-3">
              <Field label="Optimizer">
                <select 
                  value={c.optimizer} 
                  onChange={e => update("optimizer", e.target.value)} 
                  className={inputClass}
                >
                  {["auto", "SGD", "Adam", "AdamW", "NAdam", "RAdam", "RMSProp"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
              {numInput("lr0", "Initial LR (lr0)")}
              {numInput("lrf", "Final LR (lrf)")}
              {numInput("momentum", "Momentum")}
              {numInput("weight_decay", "Weight Decay")}
              {numInput("warmup_epochs", "Warmup Epochs")}
              {numInput("warmup_momentum", "Warmup Momentum")}
              {numInput("warmup_bias_lr", "Warmup Bias LR")}
              {numInput("box", "Box Loss Wt.")}
              {numInput("cls", "Class Loss Wt.")}
              {numInput("dfl", "DFL Loss Wt.")}
            </div>
          </div>

          {/* Advanced Augmentations */}
          <div className="mb-6 border-t border-hairline pt-4">
            <h3 className="mb-4 text-[13px] font-semibold text-ink">Advanced Augmentations</h3>
            <div className="mt-4 grid gap-6 rounded-xl bg-black/5 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h4 className="mb-2 text-[12px] font-bold text-muted uppercase">Color</h4>
                <div className="grid gap-2">
                  {numInput("hsv_h", "HSV-Hue")}
                  {numInput("hsv_s", "HSV-Saturation")}
                  {numInput("hsv_v", "HSV-Value")}
                  {numInput("bgr", "BGR (probability)")}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-[12px] font-bold text-muted uppercase">Spatial</h4>
                <div className="grid gap-2">
                  {numInput("degrees", "Rotation Degrees")}
                  {numInput("translate", "Translate")}
                  {numInput("scale", "Scale")}
                  {numInput("shear", "Shear")}
                  {numInput("perspective", "Perspective")}
                  {numInput("flipud", "Flip Up-Down (prob)")}
                  {numInput("fliplr", "Flip Left-Right (prob)")}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-[12px] font-bold text-muted uppercase">Composition</h4>
                <div className="grid gap-2">
                  {numInput("mosaic", "Mosaic (prob)")}
                  {numInput("mixup", "Mixup (prob)")}
                  {numInput("copy_paste", "Copy-Paste (prob)")}
                  {numInput("erasing", "Erasing (prob)")}
                  {numInput("crop_fraction", "Crop Fraction")}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button onClick={() => onStart(c)} disabled={disabled}>Start Training</Button>
      </div>
    </div>
  );
}
