import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { attachPushHub } from "./api/push.js";
import { createApiRouter } from "./api/routes.js";
import { parsePollingConfigFromEnv, startPolling } from "./polling/engine.js";

const PORT = Number(process.env.PORT ?? 8787);
const DEVICE_WS_PATH = "/ws/device";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));

const httpServer = createServer(app);
const pushHub = attachPushHub(httpServer, DEVICE_WS_PATH);

app.use("/api", createApiRouter(pushHub));

const pollingConfig = parsePollingConfigFromEnv(process.env);
if (pollingConfig) {
  startPolling(pollingConfig, pushHub);
  console.log(
    `[polling] activo: ${pollingConfig.assetId}/${pollingConfig.currency} cada ${pollingConfig.intervalMs}ms`
  );
} else {
  console.log(
    "[polling] desactivado (configurar POLLING_ASSET_ID + POLLING_ALERT_ABOVE/BELOW en .env para activarlo)"
  );
}

httpServer.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
  console.log(`WebSocket de push de dispositivos en ws://localhost:${PORT}${DEVICE_WS_PATH}`);
});
