import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../system_prompt";
import { executeTool, toolSpecs } from "../tools";
import type { ConversationResult } from "../types";

// Proveedor de pago, alternativo al gratuito por defecto (ver
// providers/gemini.ts y lib/index.ts).
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

function toAnthropicTools(): Anthropic.Tool[] {
  return toolSpecs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    input_schema: spec.parameters,
  }));
}

export async function runConversationTurn(
  userText: string,
  maxToolIterations = 4
): Promise<ConversationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta ANTHROPIC_API_KEY. En Vercel: Project Settings -> Environment Variables. " +
        "O usá AI_PROVIDER=gemini (gratis) en su lugar."
    );
  }
  const anthropic = new Anthropic({ apiKey });
  const tools = toAnthropicTools();
  const toolCalls: ConversationResult["toolCalls"] = [];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userText }];

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
