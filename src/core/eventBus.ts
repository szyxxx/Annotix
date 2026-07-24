// Core Categorized Event Bus

export type EventCategory = "System" | "Project" | "Dataset" | "Annotation" | "AI";

export interface EventMessage<T = any> {
  category: EventCategory;
  name: string;
  payload?: T;
  timestamp: number;
}

export interface EventMap {
  System: {
    Ready: void;
    Shutdown: void;
    WorkspaceCreated: any;
    WorkspaceOpened: any;
  };
  Project: {
    Loaded: any;
    Saved: any;
    Closed: void;
  };
}

type EventHandler<T = any> = (message: EventMessage<T>) => void;

class CategorizedEventBus {
  private listeners = new Map<EventCategory, Map<string, Set<EventHandler>>>();

  constructor() {
    const categories: EventCategory[] = ["System", "Project", "Dataset", "Annotation", "AI"];
    categories.forEach(cat => this.listeners.set(cat, new Map()));
  }

  subscribe<T = any>(category: EventCategory, eventName: string, handler: EventHandler<T>) {
    const categoryMap = this.listeners.get(category)!;
    if (!categoryMap.has(eventName)) {
      categoryMap.set(eventName, new Set());
    }
    categoryMap.get(eventName)!.add(handler as EventHandler);

    return () => {
      categoryMap.get(eventName)?.delete(handler as EventHandler);
    };
  }

  emit<T = any>(category: EventCategory, eventName: string, payload?: T) {
    const message: EventMessage<T> = {
      category,
      name: eventName,
      payload,
      timestamp: Date.now()
    };

    const categoryMap = this.listeners.get(category);
    if (categoryMap && categoryMap.has(eventName)) {
      categoryMap.get(eventName)!.forEach(handler => handler(message));
    }
  }
}

export const eventBus = new CategorizedEventBus();
