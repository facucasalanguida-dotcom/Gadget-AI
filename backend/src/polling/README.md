# polling/

Fase 2 — no implementado todavía (ver `docs/spec.md`, Sección 7).

Alcance previsto:
- Módulo de polling a 1-2 fuentes configurables (ej. precio de un activo)
  con umbral de alerta configurable.
- Cuando cruza el umbral, llama a `DevicePushHub.broadcast(...)`
  (`backend/src/api/push.ts`, ya implementado) para empujar la alerta al
  ESP32 sin que el usuario pregunte.

No adelantar esta implementación sin haber cerrado el criterio de aceptación
de la Fase 1 (CLAUDE.md).
