// Fuente de precio de ejemplo para el polling de Fase 2 (spec: "precio de un
// activo"). CoinGecko porque su API pública no requiere API key — mantiene
// la Fase 2 gratis, en línea con el motor de IA por defecto.

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
    throw new Error(
      `No se encontró precio para "${assetId}/${currency}" en la respuesta de CoinGecko ` +
        `(¿asset_id o currency mal escritos? ver https://api.coingecko.com/api/v3/coins/list)`
    );
  }
  return price;
}
