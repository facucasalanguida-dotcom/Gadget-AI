import { describe, expect, it } from "vitest";
import { executeTool } from "../src/orchestrator/tools.js";

describe("executeTool", () => {
  it("get_device_time devuelve un ISO datetime parseable", () => {
    const result = JSON.parse(executeTool("get_device_time", {}));
    expect(() => new Date(result.iso_datetime)).not.toThrow();
    expect(Number.isNaN(new Date(result.iso_datetime).getTime())).toBe(false);
  });

  it("get_device_status marca la bateria como no implementada en Fase 1", () => {
    const result = JSON.parse(executeTool("get_device_status", {}));
    expect(result.battery_percent).toBeNull();
  });

  it("tool desconocida devuelve un error estructurado", () => {
    const result = JSON.parse(executeTool("tool_inexistente", {}));
    expect(result.error).toContain("tool_inexistente");
  });
});
