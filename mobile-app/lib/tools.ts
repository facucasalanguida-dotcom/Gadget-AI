// Misma idea que backend/src/orchestrator/tools.ts, duplicada acá para que
// mobile-app funcione de forma autocontenida en Vercel (ver lib/providers/).

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
    description: "Devuelve la fecha y hora actual, en ISO 8601.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_device_status",
    description:
      "Devuelve el estado simulado del dispositivo (batería, conectividad). El " +
      "simulador web no tiene batería real: siempre devuelve null.",
    parameters: { type: "object", properties: {} },
  },
];

export function executeTool(name: string): string {
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
