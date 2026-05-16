import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

let wss: WebSocketServer | null = null;
const connections = new Map<string, Set<WebSocket>>();

export function initWebSockets(server: Server) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws, req) => {
    // Basic url parsing to get squadId from ?squadId=...
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const squadId = url.searchParams.get("squadId");
    
    if (squadId) {
      if (!connections.has(squadId)) {
        connections.set(squadId, new Set());
      }
      connections.get(squadId)?.add(ws);

      ws.on("close", () => {
        connections.get(squadId)?.delete(ws);
      });
    }
  });
}

export function broadcastToSquad(squadId: string, event: { type: string, payload: any }) {
  const squadConns = connections.get(squadId);
  if (!squadConns) return;

  const message = JSON.stringify(event);
  for (const ws of squadConns) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
