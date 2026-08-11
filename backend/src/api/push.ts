import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

// Canal push hacia dispositivos ESP32 conectados (WebSocket persistente).
// Fase 1: sólo mantiene la conexión abierta (el ESP32 aún no necesita recibir
// nada proactivamente). Fase 2 lo usa para empujar alertas de polling/ sin
// que el ESP32 tenga que preguntar.

export interface DevicePushHub {
  connectedCount(): number;
  broadcast(eventType: string, payload: unknown): void;
}

export function attachPushHub(server: HttpServer, path: string): DevicePushHub {
  const wss = new WebSocketServer({ server, path });
  const clients = new Set<WebSocket>();

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });

  return {
    connectedCount: () => clients.size,
    broadcast: (eventType, payload) => {
      const message = JSON.stringify({ type: eventType, payload, ts: Date.now() });
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    },
  };
}
