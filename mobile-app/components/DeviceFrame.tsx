"use client";

import type { ReactNode } from "react";

// Marco visual que imita la proporción 480x320 (3:2) de la pantalla del
// Freenove CYD, escalado para verse bien en un teléfono.
export function DeviceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-[28px] border-4 border-neutral-800 bg-neutral-900 p-3 shadow-2xl shadow-black/60">
          <div
            className="relative flex aspect-[480/320] w-full flex-col overflow-hidden rounded-xl bg-device-bg p-3 text-white"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 0%, rgba(79,140,255,0.18), transparent 55%)",
            }}
          >
            {children}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wide text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
            Simulador · Freenove CYD 3.5&quot; · 480x320
          </div>
        </div>
      </div>
    </div>
  );
}
