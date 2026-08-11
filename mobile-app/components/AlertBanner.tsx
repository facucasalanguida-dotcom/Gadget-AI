"use client";

// Espeja ui::show_alert_banner() del firmware (firmware/src/ui/ui.cpp) —
// mismo concepto visual, para que el simulador y el dispositivo real
// reaccionen igual a un push de Fase 2. Sólo aparece cuando mobile-app está
// conectada a un backend/ real (ver NEXT_PUBLIC_BACKEND_URL en page.tsx);
// en el modo autocontenido de Vercel no hay quien empuje alertas.
export function AlertBanner({ title, body }: { title: string; body: string }) {
  return (
    <div className="absolute inset-x-2 top-2 z-10 rounded-md bg-amber-500/95 px-3 py-2 text-xs font-medium text-black shadow-lg animate-pulse">
      <span className="font-bold">{title}</span> — {body}
    </div>
  );
}
