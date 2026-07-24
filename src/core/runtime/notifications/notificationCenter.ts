import { eventBus } from "../../../shared/core/eventBus";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationPayload {
  message: string;
  type: NotificationType;
  timeoutMs?: number;
}

export class NotificationCenter {
  publish(payload: NotificationPayload) {
    // We emit it globally so UI (e.g. Toast Provider) can listen
    // We can add a "Notifications" category to our EventBus if needed.
    // For now, using a raw pattern.
    eventBus.emit("System" as any, "Notification", payload);
  }

  info(message: string, timeoutMs?: number) {
    this.publish({ message, type: "info", timeoutMs });
  }

  success(message: string, timeoutMs?: number) {
    this.publish({ message, type: "success", timeoutMs });
  }

  error(message: string, timeoutMs?: number) {
    this.publish({ message, type: "error", timeoutMs });
  }
}
