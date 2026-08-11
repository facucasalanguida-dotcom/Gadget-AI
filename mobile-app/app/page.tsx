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
  threshold: number;
}

// Conecta al canal de push del backend/ real (Fase 2) para mostrar alertas
// proactivas sin que el usuario pregunte nada — sólo funciona si se apuntó
// mobile-app a un backend corriendo de verdad vía NEXT_PUBLIC_BACKEND_URL;
// el modo autocontenido (default en Vercel) no tiene quien empuje alertas.
function useBackendAlerts() {
  const [alert, setAlert] = useState<AlertPayload | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!BACKEND_URL) return;

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
        if (msg.type === "alert") {
          setAlert(msg.payload as AlertPayload);
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setAlert(null), 6000);
        }
      } catch {
        // payload no-JSON, ignorar
      }
    };

    return () => socket.close();
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
  const alert = useBackendAlerts();
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
