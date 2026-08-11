import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContentMock = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = { generateContent: generateContentMock };
    },
  };
});

describe("providers/gemini runConversationTurn", () => {
  beforeEach(() => {
    vi.resetModules();
    generateContentMock.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("devuelve el texto final cuando el modelo no pide tools", async () => {
    generateContentMock.mockResolvedValueOnce({
      text: "Hola, todo bien.",
      functionCalls: undefined,
      candidates: [{ content: { role: "model", parts: [{ text: "Hola, todo bien." }] } }],
    });

    const { runConversationTurn } = await import(
      "../../src/orchestrator/providers/gemini.js"
    );
    const result = await runConversationTurn("hola");

    expect(result.responseText).toBe("Hola, todo bien.");
    expect(result.toolCalls).toHaveLength(0);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("ejecuta la tool pedida y hace un segundo llamado con el resultado", async () => {
    generateContentMock
      .mockResolvedValueOnce({
        text: undefined,
        functionCalls: [{ name: "get_device_time", args: {}, id: "call_1" }],
        candidates: [
          {
            content: {
              role: "model",
              parts: [{ functionCall: { name: "get_device_time", args: {} } }],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        text: "Son las 10 de la mañana.",
        functionCalls: undefined,
        candidates: [
          { content: { role: "model", parts: [{ text: "Son las 10 de la mañana." }] } },
        ],
      });

    const { runConversationTurn } = await import(
      "../../src/orchestrator/providers/gemini.js"
    );
    const result = await runConversationTurn("¿qué hora es?");

    expect(result.responseText).toBe("Son las 10 de la mañana.");
    expect(result.toolCalls).toEqual([{ name: "get_device_time", input: {} }]);
    expect(generateContentMock).toHaveBeenCalledTimes(2);
  });

  it("corta el loop tras el máximo de iteraciones de tool calling", async () => {
    generateContentMock.mockResolvedValue({
      text: undefined,
      functionCalls: [{ name: "get_device_status", args: {}, id: "call_x" }],
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ functionCall: { name: "get_device_status", args: {} } }],
          },
        },
      ],
    });

    const { runConversationTurn } = await import(
      "../../src/orchestrator/providers/gemini.js"
    );
    const result = await runConversationTurn("loop infinito", 2);

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(result.responseText).toMatch(/No pude terminar/);
  });

  it("tira un error claro si falta GEMINI_API_KEY", async () => {
    delete process.env.GEMINI_API_KEY;
    const { runConversationTurn } = await import(
      "../../src/orchestrator/providers/gemini.js"
    );
    await expect(runConversationTurn("hola")).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
