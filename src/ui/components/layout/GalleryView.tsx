import { CheckCircle2, FolderOpen } from "lucide-react";
export interface ImageData {
  id: string;
  url: string;
  name: string;
  annotated: boolean;
}

interface GalleryViewProps {
  images: ImageData[];
  onOpenImage: (id: string) => void;
  onOpenDataset: () => void;
  isLoading: boolean;
}

export default function GalleryView({ images, onOpenImage, onOpenDataset, isLoading }: GalleryViewProps) {
  const annotatedCount = images.filter(img => img.annotated).length;

  if (images.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <FolderOpen size={40} />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">No Dataset Loaded</h2>
          <p className="text-muted-foreground text-sm">
            Open a folder containing your images to start annotating. Supported formats: JPG, PNG, JPEG.
          </p>
          <button 
            onClick={onOpenDataset}
            disabled={isLoading}
            className="mt-4 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            {isLoading ? "Loading..." : "Open Dataset Folder"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background p-6 overflow-auto">
      {/* Header / Stats */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dataset Overview</h1>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            {images.length} images total &middot; {annotatedCount} annotated
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onOpenDataset}
            className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            Open Different Folder
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
        {images.map((img) => (
          <div 
            key={img.id}
            onClick={() => onOpenImage(img.id)}
            className="group relative aspect-square bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/50 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 ring-1 ring-white/5"
          >
            {/* Image Thumbnail */}
            <img 
              src={img.url} 
              alt={img.name}
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500 ease-out"
              loading="lazy"
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Filename */}
            <div className="absolute bottom-0 left-0 p-4 w-full">
              <p className="text-sm font-semibold text-white truncate drop-shadow-md tracking-wide">
                {img.name}
              </p>
            </div>

            {/* Status Badge */}
            {img.annotated && (
              <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg backdrop-blur-md border border-white/20">
                <CheckCircle2 size={16} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
