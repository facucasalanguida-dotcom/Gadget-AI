import * as anthropicProvider from "./providers/anthropic";
import * as geminiProvider from "./providers/gemini";
import type { ConversationResult, ConversationRunner } from "./types";

export type { ConversationResult };

// AI_PROVIDER controla qué motor orquesta el tool calling. Default "gemini"
// porque es gratis (sin tarjeta) — ver mobile-app/.env.example. "anthropic"
// queda como alternativa para quien ya tenga una API key de pago.
const PROVIDERS: Record<string, ConversationRunner> = {
  gemini: geminiProvider.runConversationTurn,
  anthropic: anthropicProvider.runConversationTurn,
};

function resolveProvider(): ConversationRunner {
  const name = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  const runner = PROVIDERS[name];
  if (!runner) {
    throw new Error(
      `AI_PROVIDER="${name}" desconocido. Valores válidos: ${Object.keys(PROVIDERS).join(", ")}.`
    );
  }
  return runner;
}

export async function runConversationTurn(
  userText: string,
  maxToolIterations = 4
): Promise<ConversationResult> {
  const runner = resolveProvider();
  return runner(userText, maxToolIterations);
}
