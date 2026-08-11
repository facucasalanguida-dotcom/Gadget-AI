import express, { type Request, type Response } from "express";
import { runConversationTurn } from "../orchestrator/index.js";
import { transcribePcm } from "./transcribe.js";
import type { DevicePushHub } from "./push.js";

export function createApiRouter(pushHub: DevicePushHub) {
  const router = express.Router();

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, devices_connected: pushHub.connectedCount() });
  });

  // Endpoint principal de la Fase 1. Acepta:
  //  - JSON { "text": "..." } -> usado por mobile-app (STT ya hecho en el
  //    browser) y para testing manual.
  //  - application/octet-stream (PCM crudo) -> lo que enviaría el ESP32 real.
  //    Requiere que transcribePcm() esté implementado (ver api/transcribe.ts).
  router.post("/voice", async (req: Request, res: Response) => {
    try {
      let userText: string;

      if (req.is("application/json")) {
        const body = req.body as { text?: string };
        if (!body.text || typeof body.text !== "string") {
          res.status(400).json({ error: "Falta 'text' en el body JSON." });
          return;
        }
        userText = body.text;
      } else if (req.is("application/octet-stream")) {
        userText = await transcribePcm(req.body as Buffer);
      } else {
        res.status(415).json({
          error:
            "Content-Type no soportado. Usar application/json {text} o application/octet-stream.",
        });
        return;
      }

      const result = await runConversationTurn(userText);
      res.json({ response_text: result.responseText, tool_calls: result.toolCalls });
    } catch (err) {
      // El backend nunca asume que el ESP32 sigue conectado ni deja la
      // request colgada: siempre responde, incluso ante error.
      const message = err instanceof Error ? err.message : "Error desconocido";
      res.status(502).json({ error: message });
    }
  });

  return router;
}
