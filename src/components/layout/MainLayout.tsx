import React from "react";
import { Folder, Image as ImageIcon, Settings, Save, BrainCircuit, ChevronLeft, Sparkles } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  currentView: "gallery" | "annotator";
  onNavigate: (view: "gallery" | "annotator") => void;
  selectedImage: string | null;
  onBack: () => void;
  onOpenDataset: () => void;
  onOpenSettings: () => void;
  onAiAssist?: () => void;
  isAiLoading?: boolean;
}

export default function MainLayout({ 
  children, currentView, onNavigate, selectedImage, 
  onBack, onOpenDataset, onOpenSettings, onAiAssist, isAiLoading 
}: MainLayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-border bg-card flex flex-col justify-between transition-all duration-300">
        <div>
          <div className="p-4 flex items-center justify-center md:justify-start gap-3 border-b border-border">
            <img src="/annotix.png" alt="Annotix Logo" className="w-8 h-8 object-contain" />
            <span className="hidden md:block font-bold text-xl text-foreground">
              annotix
            </span>
          </div>
          <nav className="p-2 space-y-2 mt-4">
            <SidebarItem 
              icon={<Folder />} 
              label="Open Dataset" 
              onClick={onOpenDataset} 
            />
            <SidebarItem 
              icon={<ImageIcon />} 
              label="Gallery" 
              active={currentView === "gallery"} 
              onClick={() => onNavigate("gallery")} 
            />
            <SidebarItem 
              icon={<Settings />} 
              label="AI Models" 
              onClick={onOpenSettings} 
            />
          </nav>
        </div>
        <div className="p-2 border-t border-border">
          <SidebarItem icon={<Save />} label="Export YOLO" onClick={() => {}} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative bg-zinc-950 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-4 justify-between z-20 shadow-sm">
          <div className="flex items-center gap-4">
            {currentView === "annotator" && (
              <button 
                onClick={onBack}
                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={20} />
                <span className="text-sm font-medium hidden sm:block">Back</span>
              </button>
            )}
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="text-foreground">Dataset</span> 
              <span>/</span> 
              {selectedImage || "All Images"}
            </h2>
          </div>

          <div className="flex gap-2">
            {currentView === "annotator" && (
              <div className="relative group">
                <button 
                  onClick={onAiAssist}
                  disabled={isAiLoading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all border border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={14} className={isAiLoading ? "animate-pulse" : ""} />
                  <span>{isAiLoading ? "Processing..." : "AI Assist"}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
        active 
          ? "bg-primary/10 text-primary border border-primary/20" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <span className="hidden md:block text-sm font-medium whitespace-nowrap">{label}</span>
    </button>
  );
}
