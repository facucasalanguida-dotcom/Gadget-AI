// Tools de ejemplo para la Fase 1, definidas una sola vez en JSON Schema
// "canónico" y adaptadas a la forma que pide cada proveedor en
// providers/anthropic.ts y providers/gemini.ts. El objetivo es dejar el
// patrón de tool calling funcionando end-to-end (el modelo decide -> backend
// ejecuta -> el modelo recibe el resultado) sin importar qué motor de IA
// esté detrás — no proveer tools "reales" de producto todavía. Fase 4
// reemplaza/extiende esto con servidores MCP (ver backend/src/mcp/).

export interface ToolSpec {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const toolSpecs: ToolSpec[] = [
  {
    name: "get_device_time",
    description:
      "Devuelve la fecha y hora actual del servidor backend, en ISO 8601. " +
      "Usar cuando el usuario pregunte la hora o la fecha.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_device_status",
    description:
      "Devuelve el estado simulado del dispositivo (batería, conectividad). " +
      "En Fase 1 el valor de batería es un placeholder fijo: la lectura real " +
      "de voltaje se implementa en power/ a partir de la Fase 2.",
    parameters: { type: "object", properties: {} },
  },
];

export function executeTool(name: string, _input: unknown): string {
  switch (name) {
    case "get_device_time":
      return JSON.stringify({ iso_datetime: new Date().toISOString() });
    case "get_device_status":
      return JSON.stringify({
        battery_percent: null,
        battery_note: "No implementado hasta Fase 2 (power/).",
        connectivity: "wifi",
      });
    default:
      return JSON.stringify({ error: `Tool desconocida: ${name}` });
  }
}
