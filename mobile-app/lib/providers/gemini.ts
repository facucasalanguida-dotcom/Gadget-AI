import { GoogleGenAI, type Content, type Tool } from "@google/genai";
import { SYSTEM_PROMPT } from "../system_prompt";
import { executeTool, toolSpecs } from "../tools";
import type { ConversationResult } from "../types";

// Proveedor gratuito por defecto. Google AI Studio da una API key gratis,
// sin tarjeta de crédito, con tool calling nativo — ver
// https://aistudio.google.com/apikey. "gemini-flash-latest" es un alias
// estable que Google mantiene apuntando al modelo Flash vigente.
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

export async function runConversationTurn(
  userText: string,
  maxToolIterations = 4
): Promise<ConversationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta GEMINI_API_KEY. Conseguí una gratis, sin tarjeta, en " +
        "https://aistudio.google.com/apikey y cargala en Vercel Project Settings -> " +
        "Environment Variables."
    );
  }
  const ai = new GoogleGenAI({ apiKey });
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

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    const responseParts = functionCalls.map((call) => {
      const name = call.name ?? "";
      toolCalls.push({ name, input: call.args });
      const result = executeTool(name);
      return {
        functionResponse: { name, response: { output: JSON.parse(result) } },
      };
    });
    contents.push({ role: "user", parts: responseParts });
  }

  return {
    responseText: "No pude terminar de procesar el pedido (demasiadas herramientas encadenadas).",
    toolCalls,
  };
}
