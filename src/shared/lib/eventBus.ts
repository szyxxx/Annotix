// Annotix Global Event Bus
// Loose coupling architecture for Phase 0

export type EventType = 
  | "ProjectOpened"
  | "ProjectClosed"
  | "ImageLoaded"
  | "AnnotationChanged"
  | "InferenceStarted"
  | "InferenceFinished"
  | "ExportCompleted"
  | "AssetImported"
  | "AssetProcessingStarted"
  | "AssetThumbnailGenerated"
  | "AssetReady"
  | "AssetFailed"
  | "DatasetImportStarted" // Keep these for overall progress
  | "DatasetImportProgress"
  | "DatasetImportCompleted"
  | "DatasetImportFailed";

type EventHandler = (payload?: any) => void;

class EventBus {
  private listeners: Map<EventType, Set<EventHandler>> = new Map();

  subscribe(event: EventType, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit(event: EventType, payload?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.forEach(handler => handler(payload));
    }
  }
}

export const eventBus = new EventBus();
