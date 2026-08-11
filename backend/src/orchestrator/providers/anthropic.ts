import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../system_prompt.js";
import { executeTool, toolSpecs } from "../tools.js";
import type { ConversationResult } from "../types.js";

// Proveedor de pago (requiere ANTHROPIC_API_KEY con crédito). Ver
// providers/gemini.ts para el proveedor gratuito por defecto. Ambos
// implementan la misma firma (ver orchestrator/index.ts).

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

function toAnthropicTools(): Anthropic.Tool[] {
  return toolSpecs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    input_schema: spec.parameters,
  }));
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta ANTHROPIC_API_KEY (ver backend/.env.example). Si no tenés una " +
          "key paga de Anthropic, usá AI_PROVIDER=gemini (gratis) en su lugar."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
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
  const tools = toAnthropicTools();
  const toolCalls: ConversationResult["toolCalls"] = [];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userText },
  ];

  for (let i = 0; i < maxToolIterations; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
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
