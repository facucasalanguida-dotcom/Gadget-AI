// Misma fuente que usa backend/src/polling/sources/coingecko.ts, duplicada
// acá por la misma razón que el resto de lib/: que mobile-app funcione de
// forma autocontenida en Vercel sin depender de un backend/ separado.

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

export async function fetchPrice(assetId: string, currency: string): Promise<number> {
  const url = `${COINGECKO_URL}?ids=${encodeURIComponent(assetId)}&vs_currencies=${encodeURIComponent(currency)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CoinGecko respondió ${res.status} para ${assetId}/${currency}`);
  }
  const data = (await res.json()) as Record<string, Record<string, number>>;
  const price = data?.[assetId]?.[currency];
  if (typeof price !== "number") {
    throw new Error(`No se encontró precio para "${assetId}/${currency}" en CoinGecko`);
  }
  return price;
}
