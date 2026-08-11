"use client";

import { useEffect, useRef, useState } from "react";
import { ActionCard, type ActionCardSpec } from "@/components/ActionCard";
import { AlertBanner } from "@/components/AlertBanner";
import { DeviceFrame } from "@/components/DeviceFrame";
import { MicButton } from "@/components/MicButton";

// Espeja las tarjetas de acción de firmware/src/main.cpp (kActionCards) para
// que el comportamiento del simulador y el del dispositivo real coincidan.
const ACTION_CARDS: ActionCardSpec[] = [
  { id: "status", label: "Estado", emoji: "🏠" },
  { id: "ask", label: "Preguntar", emoji: "⌨️" },
  { id: "routine", label: "Rutina", emoji: "📋" },
];

const ACTION_PROMPTS: Record<string, string> = {
  status: "¿Cuál es el estado del dispositivo ahora mismo?",
  routine: "Contame qué rutina tenés configurada para este momento del día.",
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL; // opcional: apuntar al backend/ real

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// No hay batería real en un navegador — simulamos una descarga lenta sólo
// para que la UI del simulador se vea/comporte como la del firmware
// (ui::set_battery en firmware/src/ui/ui.cpp), que sí lee un ADC real.
function useMockBattery() {
  const [percent, setPercent] = useState(87);
  useEffect(() => {
    const id = setInterval(() => {
      setPercent((p) => Math.max(15, p - 1));
    }, 20000);
    return () => clearInterval(id);
  }, []);
  return percent;
}

interface AlertPayload {
  category: string;
  assetId: string;
  currency: string;
  price: number;
  threshold?: number;
}

const CLIENT_ALERT_POLL_MS = 15000;
const ALERT_BANNER_MS = 6000;

/**
 * Muestra alertas proactivas de Fase 2 sin que el usuario pregunte nada, de
 * dos formas mutuamente excluyentes según cómo esté configurada la app:
 *
 * - Con NEXT_PUBLIC_BACKEND_URL seteado: se conecta por WebSocket al
 *   backend/ real (push de verdad, como lo vería el ESP32).
 * - Sin esa variable (modo autocontenido, el default en Vercel): pollea
 *   GET /api/alerts cada CLIENT_ALERT_POLL_MS y detecta el cruce de umbral
 *   del lado del cliente — mismo resultado visual, sin necesitar un
 *   backend con WebSocket persistente desplegado aparte.
 */
function useAlerts() {
  const [alert, setAlert] = useState<AlertPayload | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasAbove = useRef(false);
  const wasBelow = useRef(false);

  function fireAlert(payload: AlertPayload) {
    setAlert(payload);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setAlert(null), ALERT_BANNER_MS);
  }

  useEffect(() => {
    if (BACKEND_URL) {
      const wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/ws/device";
      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        return;
      }
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "alert") fireAlert(msg.payload as AlertPayload);
        } catch {
          // payload no-JSON, ignorar
        }
      };
      return () => socket.close();
    }

    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        if (!data.configured || data.error) return;

        const { assetId, price, currency, above, below } = data as {
          assetId: string;
          price: number;
          currency: string;
          above?: number;
          below?: number;
        };

        if (above !== undefined) {
          const crossed = price > above;
          if (crossed && !wasAbove.current) {
            fireAlert({ category: "price_above", assetId, price, currency, threshold: above });
          }
          wasAbove.current = crossed;
        }
        if (below !== undefined) {
          const crossed = price < below;
          if (crossed && !wasBelow.current) {
            fireAlert({ category: "price_below", assetId, price, currency, threshold: below });
          }
          wasBelow.current = crossed;
        }
      } catch {
        // sin red por este ciclo, se reintenta solo en el próximo poll
      }
    }, CLIENT_ALERT_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return alert;
}

function batteryEmoji(percent: number): string {
  if (percent > 75) return "🔋";
  if (percent > 25) return "🪫";
  return "🪫";
}

export default function Home() {
  const now = useClock();
  const battery = useMockBattery();
  const alert = useAlerts();
  const [processing, setProcessing] = useState(false);
  const [responseText, setResponseText] = useState(
    "Tocá el micrófono o escribí abajo para hablar con el agente."
  );
  const [manualText, setManualText] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const url = BACKEND_URL ? `${BACKEND_URL}/api/health` : null;
    if (!url) {
      setConnected(true); // modo autocontenido: usa la API route local
      return;
    }
    fetch(url)
      .then((r) => setConnected(r.ok))
      .catch(() => setConnected(false));
  }, []);

  async function sendToAgent(text: string) {
    if (!text.trim()) return;
    setProcessing(true);
    setResponseText("");
    try {
      const endpoint = BACKEND_URL ? `${BACKEND_URL}/api/voice` : "/api/voice";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error del backend");

      setResponseText(data.response_text);
      if ("speechSynthesis" in window && data.response_text) {
        const utterance = new SpeechSynthesisUtterance(data.response_text);
        utterance.lang = "es-AR";
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setResponseText(
        `⚠️ ${err instanceof Error ? err.message : "No se pudo contactar al backend."}`
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleCardTap(id: string) {
    if (id === "ask") {
      document.getElementById("manual-text-input")?.focus();
      return;
    }
    sendToAgent(ACTION_PROMPTS[id] ?? id);
  }

  return (
    <DeviceFrame>
      {alert && (
        <AlertBanner
          title="Alerta"
          body={`${alert.assetId}: ${alert.price} ${alert.currency.toUpperCase()}`}
        />
      )}

      {/* Reloj + batería + métrica, igual que ui::set_clock / ui::set_battery / ui::set_metric en firmware */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-2xl font-semibold tabular-nums">
            {now ? now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
          </span>
          <div className="mt-0.5 text-xs text-neutral-400">
            {batteryEmoji(battery)} {battery}%
          </div>
        </div>
        <div className="text-right text-xs text-neutral-400">
          <div>Backend</div>
          <div
            className={`font-semibold ${
              connected === false ? "text-red-400" : "text-device-accent2"
            }`}
          >
            {connected === null ? "…" : connected ? "conectado" : "sin conexión"}
          </div>
        </div>
      </div>

      {/* Tarjetas de acción táctiles */}
      <div className="mt-4 flex gap-2">
        {ACTION_CARDS.map((card) => (
          <ActionCard key={card.id} card={card} onTap={handleCardTap} disabled={processing} />
        ))}
      </div>

      {/* Respuesta + estado de procesando */}
      <div className="mt-4 flex-1 overflow-y-auto rounded-lg bg-black/20 p-3 text-sm leading-snug text-neutral-100">
        {processing ? (
          <span className="text-neutral-400">Procesando…</span>
        ) : (
          responseText
        )}
      </div>

      {/* Mic + input manual (fallback si el navegador no soporta Web Speech API) */}
      <div className="mt-3 flex items-center gap-2">
        <MicButton onTranscript={sendToAgent} disabled={processing} />
        <input
          id="manual-text-input"
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendToAgent(manualText);
              setManualText("");
            }
          }}
          placeholder="O escribí tu mensaje..."
          disabled={processing}
          className="flex-1 rounded-full border border-white/10 bg-device-panel px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-device-accent disabled:opacity-40"
        />
      </div>
    </DeviceFrame>
  );
}
