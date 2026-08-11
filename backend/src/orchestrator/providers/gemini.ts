import { GoogleGenAI, type Content, type Tool } from "@google/genai";
import { SYSTEM_PROMPT } from "../system_prompt.js";
import { executeTool, toolSpecs } from "../tools.js";
import type { ConversationResult } from "../types.js";

// Proveedor gratuito por defecto (ver orchestrator/index.ts). Google AI
// Studio da una API key gratis, sin tarjeta de crédito, con tool calling
// nativo. "gemini-flash-latest" es un alias estable que Google actualiza
// al modelo Flash vigente (evita hardcodear una versión que se deprecie) —
// ver https://ai.google.dev/gemini-api/docs/rate-limits para los límites
// del free tier actuales.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

function toGeminiTools(): Tool[] {
  return [
    {
      functionDeclarations: toolSpecs.map((spec) => ({
        name: spec.name,
        description: spec.description,
        parametersJsonSchema: spec.parameters,
      })),
    },
  ];
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta GEMINI_API_KEY (ver backend/.env.example). Conseguí una gratis, " +
          "sin tarjeta, en https://aistudio.google.com/apikey"
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export async function runConversationTurn(
  userText: string,
  maxToolIterations = 4
): Promise<ConversationResult> {
  const ai = getClient();
  const tools = toGeminiTools();
  const toolCalls: ConversationResult["toolCalls"] = [];

  const contents: Content[] = [{ role: "user", parts: [{ text: userText }] }];

  for (let i = 0; i < maxToolIterations; i++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM_PROMPT, tools },
    });

    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      return { responseText: response.text ?? "", toolCalls };
    }

    // El turno del modelo (con las function calls) tiene que volver a
    // mandarse tal cual en el próximo request, o Gemini pierde el contexto
    // de qué pidió.
    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    const responseParts = functionCalls.map((call) => {
      const name = call.name ?? "";
      toolCalls.push({ name, input: call.args });
      const result = executeTool(name, call.args);
      return {
        functionResponse: {
          name,
          response: { output: JSON.parse(result) },
        },
      };
    });
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    responseText:
      "No pude terminar de procesar el pedido (demasiadas herramientas encadenadas).",
    toolCalls,
  };
}
