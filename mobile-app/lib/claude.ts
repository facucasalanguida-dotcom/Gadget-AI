import Anthropic from "@anthropic-ai/sdk";

// Misma lógica de orquestación que backend/src/orchestrator/claude.ts,
// duplicada acá a propósito: este endpoint serverless existe para que
// mobile-app funcione de forma autocontenida al desplegarse en Vercel (sin
// depender de tener el backend/ real corriendo en otro lado). El backend/
// "de verdad" (el que eventualmente habla con el ESP32) vive en
// backend/src/orchestrator/claude.ts y es la versión que hay que mantener
// como fuente de verdad cuando se agregue lógica nueva (tools reales, MCP).

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const SYSTEM_PROMPT = `Sos el cerebro de un agente de IA portatil (dispositivo ESP32-S3
con pantalla tactil de 3.5"). Estás corriendo en el simulador web del dispositivo, previo
al hardware real. Respondé siempre en español, corto y claro (pantalla chica, a veces se
lee en voz alta) — máximo 2-3 oraciones salvo que el usuario pida más detalle.`;

const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_device_time",
    description: "Devuelve la fecha y hora actual, en ISO 8601.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_device_status",
    description:
      "Devuelve el estado simulado del dispositivo (batería, conectividad). El " +
      "simulador web no tiene batería real: siempre devuelve null.",
    input_schema: { type: "object", properties: {} },
  },
];

function executeTool(name: string): string {
  switch (name) {
    case "get_device_time":
      return JSON.stringify({ iso_datetime: new Date().toISOString() });
    case "get_device_status":
      return JSON.stringify({
        battery_percent: null,
        battery_note: "Simulador web: no hay batería real.",
        connectivity: "wifi (simulado)",
      });
    default:
      return JSON.stringify({ error: `Tool desconocida: ${name}` });
  }
}

export interface ConversationResult {
  responseText: string;
  toolCalls: Array<{ name: string; input: unknown }>;
}

export async function runConversationTurn(
  userText: string,
  maxToolIterations = 4
): Promise<ConversationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta ANTHROPIC_API_KEY. En Vercel: Project Settings -> Environment Variables."
    );
  }
  const anthropic = new Anthropic({ apiKey });
  const toolCalls: ConversationResult["toolCalls"] = [];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userText }];

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

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => {
      toolCalls.push({ name: block.name, input: block.input });
      return {
        type: "tool_result",
        tool_use_id: block.id,
        content: executeTool(block.name),
      };
    });

    messages.push({ role: "user", content: toolResults });
  }

  return {
    responseText: "No pude terminar de procesar el pedido (demasiadas herramientas encadenadas).",
    toolCalls,
  };
}
