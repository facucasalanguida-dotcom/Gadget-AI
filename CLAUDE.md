# Proyecto: Agente IA Portátil ESP32-S3

## Reglas del proyecto
- El ESP32-S3 es un cliente ligero: nunca implementar lógica de LLM en `firmware/`.
- Todo cambio de firmware debe compilar con `pio run` antes de darse por bueno.
- Antes de escribir drivers de bajo nivel (pantalla/touch), confirmar pines e ICs
  en `docs/hardware-notes.md`; si no está confirmado, preguntar en vez de asumir.
- Seguir el orden de fases de la especificación (`docs/spec.md`); no adelantar tareas de
  una fase posterior sin haber cerrado el criterio de aceptación de la actual.
- Preferir validar en el simulador (LVGL PC simulator / `mobile-app/`) antes de pedir
  flasheo a hardware real.
- El backend nunca asume que el ESP32 está conectado: cada endpoint debe responder de
  forma segura si el dispositivo se desconecta a mitad de una operación.
- Cada fase termina con un commit/tag (ej. `fase-1-completa`) antes de arrancar la
  siguiente.

## Estructura
- `firmware/` — código C++ (PlatformIO + Arduino + LVGL) que corre en el ESP32-S3.
- `backend/` — servicio Node.js/TypeScript: orquestación con la API de Claude, tool
  calling, MCP, polling, endpoints para el ESP32.
- `mobile-app/` — app web (Next.js) desplegable en Vercel que simula el dispositivo
  (pantalla táctil + voz) para validar el flujo end-to-end antes de tener hardware.
- `sim/` — configuración del simulador de PC de LVGL y notas de Wokwi.
- `docs/` — spec completa, notas de hardware confirmadas/pendientes.

## Comandos frecuentes
- Compilar firmware: `pio run -e esp32-s3-devkit`
- Flashear: `pio run -e esp32-s3-devkit -t upload`
- Monitor serie: `pio device monitor`
- Backend dev: `cd backend && npm install && npm run dev`
- Backend tests: `cd backend && npm test`
- Mobile app dev: `cd mobile-app && npm install && npm run dev`
- Mobile app build (lo que corre Vercel): `cd mobile-app && npm run build`

## Estado de fases
- **Fase 1 (base funcional: voz + pantalla táctil)**: implementada — backend con tool
  calling, firmware base LVGL + captura por botón, mobile-app simulador.
- **Fase 2 (proactividad + energía)**: scaffolded, no implementada.
- **Fase 3 (wake word + offline + OTA)**: scaffolded, no implementada.
- **Fase 4 (cámara, sensores, NFC, NEXO/MCP, app complementaria)**: scaffolded, no
  implementada.
