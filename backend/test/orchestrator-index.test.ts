import { beforeEach, describe, expect, it, vi } from "vitest";

const geminiRunner = vi.fn().mockResolvedValue({ responseText: "gemini", toolCalls: [] });
const anthropicRunner = vi
  .fn()
  .mockResolvedValue({ responseText: "anthropic", toolCalls: [] });

vi.mock("../src/orchestrator/providers/gemini.js", () => ({
  runConversationTurn: geminiRunner,
}));
vi.mock("../src/orchestrator/providers/anthropic.js", () => ({
  runConversationTurn: anthropicRunner,
}));

describe("orchestrator/index provider selection", () => {
  beforeEach(() => {
    geminiRunner.mockClear();
    anthropicRunner.mockClear();
    delete process.env.AI_PROVIDER;
  });

  it("usa gemini por default (motor gratis)", async () => {
    const { runConversationTurn } = await import("../src/orchestrator/index.js");
    const result = await runConversationTurn("hola");

    expect(result.responseText).toBe("gemini");
    expect(geminiRunner).toHaveBeenCalledWith("hola", 4);
    expect(anthropicRunner).not.toHaveBeenCalled();
  });

  it("usa anthropic si AI_PROVIDER=anthropic", async () => {
    process.env.AI_PROVIDER = "anthropic";
    const { runConversationTurn } = await import("../src/orchestrator/index.js");
    const result = await runConversationTurn("hola");

    expect(result.responseText).toBe("anthropic");
    expect(anthropicRunner).toHaveBeenCalledWith("hola", 4);
    expect(geminiRunner).not.toHaveBeenCalled();
  });

  it("tira un error claro con un AI_PROVIDER desconocido", async () => {
    process.env.AI_PROVIDER = "not-a-real-provider";
    const { runConversationTurn } = await import("../src/orchestrator/index.js");

    await expect(runConversationTurn("hola")).rejects.toThrow(/AI_PROVIDER/);
  });
});
