import type { DevicePushHub } from "../api/push.js";
import { fetchPrice } from "./sources/coingecko.js";

export interface PollingConfig {
  assetId: string;
  currency: string;
  above?: number;
  below?: number;
  intervalMs: number;
}

/**
 * Lee la config de polling desde variables de entorno. Devuelve null si no
 * hay nada configurado (el server arranca igual, sin polling — el backend
 * nunca debe fallar por esto, ver Sección 6 de CLAUDE.md).
 */
export function parsePollingConfigFromEnv(
  env: Record<string, string | undefined>
): PollingConfig | null {
  const assetId = env.POLLING_ASSET_ID;
  if (!assetId) return null;

  const above = env.POLLING_ALERT_ABOVE ? Number(env.POLLING_ALERT_ABOVE) : undefined;
  const below = env.POLLING_ALERT_BELOW ? Number(env.POLLING_ALERT_BELOW) : undefined;
  if (above === undefined && below === undefined) return null;

  return {
    assetId,
    currency: env.POLLING_CURRENCY ?? "usd",
    above,
    below,
    intervalMs: env.POLLING_INTERVAL_MS ? Number(env.POLLING_INTERVAL_MS) : 60_000,
  };
}

export type AlertCategory = "price_above" | "price_below";

export interface Alert {
  category: AlertCategory;
  assetId: string;
  currency: string;
  price: number;
  threshold: number;
}

/**
 * Dispara una alerta sólo en la transición de "no cruzado" -> "cruzado", no
 * en cada poll mientras el precio se mantenga del otro lado del umbral —
 * si no, el ESP32 vibraría sin parar.
 */
export class ThresholdWatcher {
  private aboveActive = false;
  private belowActive = false;

  check(price: number, config: PollingConfig): Alert | null {
    if (config.above !== undefined) {
      const crossed = price > config.above;
      if (crossed && !this.aboveActive) {
        this.aboveActive = true;
        return {
          category: "price_above",
          assetId: config.assetId,
          currency: config.currency,
          price,
          threshold: config.above,
        };
      }
      if (!crossed) this.aboveActive = false;
    }

    if (config.below !== undefined) {
      const crossed = price < config.below;
      if (crossed && !this.belowActive) {
        this.belowActive = true;
        return {
          category: "price_below",
          assetId: config.assetId,
          currency: config.currency,
          price,
          threshold: config.below,
        };
      }
      if (!crossed) this.belowActive = false;
    }

    return null;
  }
}

/** Devuelve una función para detener el polling (clearInterval). */
export function startPolling(config: PollingConfig, pushHub: DevicePushHub): () => void {
  const watcher = new ThresholdWatcher();

  async function tick() {
    try {
      const price = await fetchPrice(config.assetId, config.currency);
      const alert = watcher.check(price, config);
      if (alert) {
        pushHub.broadcast("alert", alert);
      }
    } catch (err) {
      console.error(
        "[polling] error consultando precio:",
        err instanceof Error ? err.message : err
      );
    }
  }

  const timer = setInterval(tick, config.intervalMs);
  void tick(); // primera lectura inmediata, no esperar el primer intervalo completo
  return () => clearInterval(timer);
}
