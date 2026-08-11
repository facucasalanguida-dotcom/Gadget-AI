import Anthropic from "@anthropic-ai/sdk";
import { executeTool, toolDefinitions } from "./tools.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const SYSTEM_PROMPT = `Sos el cerebro de un agente de IA portatil (dispositivo ESP32-S3
con pantalla tactil de 3.5"). El dispositivo es un cliente ligero: vos hacés todo el
razonamiento acá en el backend. Respondé siempre en español, corto y claro (el
dispositivo tiene una pantalla chica y a veces lee la respuesta en voz alta) — máximo
2-3 oraciones salvo que el usuario pida más detalle.`;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta ANTHROPIC_API_KEY (ver backend/.env.example)."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface ConversationResult {
  responseText: string;
  toolCalls: Array<{ name: string; input: unknown }>;
}

/**
 * Ejecuta un turno completo de conversación con tool calling: llama a Claude,
 * si pide una tool la ejecuta localmente y le devuelve el resultado, hasta
 * que Claude produce una respuesta final de texto (o se alcanza el límite de
 * iteraciones, para no dejar al ESP32 esperando indefinidamente — ver
 * Sección 10 de la spec sobre latencia variable).
 */
export async function runConversationTurn(
  userText: string,
  maxToolIterations = 4
): Promise<ConversationResult> {
  const anthropic = getClient();
  const toolCalls: ConversationResult["toolCalls"] = [];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userText },
  ];

  for (let i = 0; i < maxToolIterations; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      return { responseText: textBlock?.text ?? "", toolCalls };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
      (block) => {
        toolCalls.push({ name: block.name, input: block.input });
        const result = executeTool(block.name, block.input);
        return {
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        };
      }
    );

    messages.push({ role: "user", content: toolResults });
  }

  return {
    responseText:
      "No pude terminar de procesar el pedido (demasiadas herramientas encadenadas).",
    toolCalls,
  };
}
