import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agente IA Portátil — Simulador",
  description:
    "Simulador del dispositivo ESP32-S3 (Freenove CYD) para validar el flujo de voz + pantalla táctil antes de tener hardware.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#05070d] antialiased">{children}</body>
    </html>
  );
}
