import { NextResponse } from "next/server";
import { fetchPrice } from "@/lib/coingecko";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint stateless (sin memoria entre requests — cada invocación
// serverless puede ser una instancia distinta) para que mobile-app pueda
// mostrar alertas de Fase 2 sin depender de un backend/ separado con
// WebSocket persistente. La app consulta esto cada N segundos y decide del
// lado del cliente si cruzó el umbral (ver hook useAlerts en app/page.tsx).
export async function GET() {
  const assetId = process.env.ALERT_ASSET_ID;
  const currency = process.env.ALERT_CURRENCY ?? "usd";
  const above = process.env.ALERT_ABOVE ? Number(process.env.ALERT_ABOVE) : undefined;
  const below = process.env.ALERT_BELOW ? Number(process.env.ALERT_BELOW) : undefined;

  if (!assetId || (above === undefined && below === undefined)) {
    return NextResponse.json({ configured: false });
  }

  try {
    const price = await fetchPrice(assetId, currency);
    return NextResponse.json({ configured: true, assetId, currency, price, above, below });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "error desconocido" },
      { status: 502 }
    );
  }
}
