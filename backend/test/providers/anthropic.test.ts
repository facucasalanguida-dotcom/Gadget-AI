import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: createMock };
    },
  };
});

describe("providers/anthropic runConversationTurn", () => {
  beforeEach(() => {
    vi.resetModules();
    createMock.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("devuelve el texto final cuando el modelo no pide tools", async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "Hola, todo bien." }],
    });

    const { runConversationTurn } = await import(
      "../../src/orchestrator/providers/anthropic.js"
    );
    const result = await runConversationTurn("hola");

    expect(result.responseText).toBe("Hola, todo bien.");
    expect(result.toolCalls).toHaveLength(0);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("ejecuta la tool pedida y hace un segundo llamado con el resultado", async () => {
    createMock
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "tool_1",
            name: "get_device_time",
            input: {},
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "Son las 10 de la mañana." }],
      });

    const { runConversationTurn } = await import(
      "../../src/orchestrator/providers/anthropic.js"
    );
    const result = await runConversationTurn("¿qué hora es?");

    expect(result.responseText).toBe("Son las 10 de la mañana.");
    expect(result.toolCalls).toEqual([{ name: "get_device_time", input: {} }]);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("corta el loop tras el máximo de iteraciones de tool calling", async () => {
    createMock.mockResolvedValue({
      content: [
        { type: "tool_use", id: "tool_x", name: "get_device_status", input: {} },
      ],
    });

    const { runConversationTurn } = await import(
      "../../src/orchestrator/providers/anthropic.js"
    );
    const result = await runConversationTurn("loop infinito", 2);

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(result.responseText).toMatch(/No pude terminar/);
  });

  it("tira un error claro si falta ANTHROPIC_API_KEY", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { runConversationTurn } = await import(
      "../../src/orchestrator/providers/anthropic.js"
    );
    await expect(runConversationTurn("hola")).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
