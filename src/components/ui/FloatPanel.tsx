import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface FloatPanelProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  position: string; // Tailwind absolute positioning classes
}

export default function FloatPanel({ title, isOpen, onToggle, children, position }: FloatPanelProps) {
  return (
    <div 
      className={`absolute ${position} flex flex-col bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden transition-all duration-300 z-30`}
      style={{
        width: "280px",
        maxHeight: isOpen ? "400px" : "44px"
      }}
    >
      {/* Header */}
      <button 
        onClick={onToggle}
        className="flex items-center justify-between w-full p-3 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors border-b border-white/5"
      >
        <span className="text-sm font-semibold text-zinc-200">{title}</span>
        <div className="text-zinc-400">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {/* Body */}
      <div className={`flex-1 overflow-y-auto p-2 ${isOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}>
        {children}
      </div>
    </div>
  );
}
