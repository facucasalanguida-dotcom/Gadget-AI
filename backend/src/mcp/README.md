# mcp/

Fase 4 — no implementado todavía (ver `docs/spec.md`, Sección 7).

Alcance previsto: configuración de servidores MCP adicionales y conexión con
NEXO como capa de orquestación multi-agente, integrados al loop de tool
calling que ya existe en `backend/src/orchestrator/claude.ts` (agregar los
tools que exponga cada servidor MCP a `toolDefinitions` y despachar su
ejecución acá en vez de en `orchestrator/tools.ts`).

No adelantar esta implementación sin haber cerrado el criterio de aceptación
de la Fase 3.
