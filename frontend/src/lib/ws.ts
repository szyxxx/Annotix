import { useEffect, useRef, useState } from "react";
import type { User } from "./api";
import { useSession } from "./store";

export interface WsEvent {
  type: string;
  [key: string]: unknown;
}

/** Join a project's collaboration channel. Returns the live presence roster
 *  and a send function; onEvent fires for every broadcast in the room. */
export function useProjectSocket(
  projectId: string | undefined,
  onEvent?: (event: WsEvent) => void,
) {
  const user = useSession((s) => s.user);
  const [presence, setPresence] = useState<User[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!projectId || !user) return;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const params = new URLSearchParams({ user_id: user.id, name: user.name, color: user.color });
    const ws = new WebSocket(`${proto}://${location.host}/ws/projects/${projectId}?${params}`);
    socketRef.current = ws;
    ws.onmessage = (msg) => {
      try {
        const event: WsEvent = JSON.parse(msg.data);
        if (event.type === "presence") setPresence(event.users as User[]);
        onEventRef.current?.(event);
      } catch {
        /* ignore malformed frames */
      }
    };
    return () => {
      socketRef.current = null;
      ws.close();
    };
  }, [projectId, user]);

  const send = (event: WsEvent) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };

  return { presence, send };
}
