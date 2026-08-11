# Especificación de proyecto — Agente IA Portátil sobre ESP32-S3

> Fuente: `Spec_Proyecto_ClaudeCode_ESP32S3.pdf` (Pyflow AI, agosto 2026). Este archivo es
> la versión en markdown del documento original, para que quede versionada en el repo y
> Claude Code pueda leerla como contexto sin depender del PDF adjunto.

## 1. Resumen del proyecto

Construir un agente de IA portátil sobre una placa ESP32-S3 con pantalla táctil integrada
(familia Freenove CYD, 3.5" IPS capacitiva) que actúa como **terminal físico** de un
backend propio. El ESP32 captura voz/eventos y muestra resultados; todo el razonamiento
ocurre en un backend que orquesta llamadas a la API de Claude con tool calling,
opcionalmente vía servidores MCP. El proyecto se construye y valida principalmente en PC
(backend + simulador de UI) y se traslada al hardware real en paralelo, no al final.

| Fase | Entregable funcional |
|---|---|
| 1 | Voz + pantalla táctil básica hablando con la API de Claude, sin proactividad ni batería |
| 2 | Alertas en segundo plano (polling) + energía (batería, deep sleep) |
| 3 | Wake word local, modo offline con cola y caché, actualizaciones OTA |
| 4 | Cámara, sensores ambientales, NFC, integración con NEXO/MCP, app complementaria |

## 2. Hardware objetivo

- MCU: ESP32-S3, dual-core Xtensa LX7 a 240 MHz, WiFi 2.4GHz + Bluetooth 5 (LE).
- Memoria: PSRAM 8 MB / Flash 16 MB (imprescindible para cámara + LVGL + audio a la vez).
- Pantalla: 3.5" IPS, 480x320, táctil capacitiva.
- Audio: entrada de micrófono I2S, salida a altavoz vía amplificador integrado.
- Periféricos on-board: slot microSD, LED RGB, botones BOOT/RESET, puerto de batería.
- Puerto de batería: conector JST 1.25mm (JST-SH), **no** JST-PH 2.0.

> **CONFIRMAR ANTES DE CODEAR**: driver exacto del panel táctil (probablemente ST7796
> para el LCD + GT911 o XPT2046 para el touch, según revisión) y pinout completo de GPIO
> — confirmar contra el manual/repositorio oficial de Freenove para la SKU específica.
> No asumir de otras variantes de "CYD" genéricas. Ver `docs/hardware-notes.md`.

## 3. Arquitectura de software

- `firmware/` — C++ en el ESP32-S3 (UI, audio, sensores, red).
- `backend/` — servicio que recibe eventos del ESP32, orquesta tool calling con la API
  de Claude, gestiona MCP servers, y responde.

**Flujo de voz**: botón/wake word → ESP32 graba audio → backend transcribe (STT) → llama
a Claude (con tool calling si aplica) → backend genera audio (TTS) o texto corto →
responde al ESP32 → ESP32 reproduce/actualiza pantalla.

**Flujo de alerta proactiva (Fase 2+)**: backend hace polling (no el ESP32) → si cruza
umbral, empuja evento corto al ESP32 (WebSocket/push) que dispara vibración/LED.

## 4. Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Firmware | PlatformIO + Arduino, LVGL | Build reproducible desde CLI; LVGL tiene simulador de PC |
| Audio local | ESP-SR (wake word), I2S nativo | Wake word on-device sin depender de red |
| Backend | Node.js/TypeScript | Reutilizable para NEXO/MCP |
| Comunicación | WebSocket (audio/eventos) + HTTP REST (comandos) | Baja latencia para voz |
| Tool calling | SDK oficial de Anthropic + MCP | Mismo patrón que otros productos Pyflow |
| Simulación previa a hardware | LVGL PC simulator + Wokwi + `mobile-app/` (web) | Iterar sin placa física |

## 5-11: fases, convenciones, testing, limitaciones

Ver el resto del documento original para el detalle completo de fases (Sección 7),
convenciones de código (Sección 8), estrategia de testing/simulación (Sección 9) y
limitaciones técnicas (Sección 10) — reflejadas también en este repo:

- Cada módulo de firmware por responsabilidad única (`ui/`, `audio/`, `net/`,
  `sensors/`, `power/`).
- Toda llamada de red del firmware pasa por un único cliente en `net/`.
- No hay LLM local viable en el ESP32-S3 — todo el razonamiento vive en el backend.
- Presupuesto de RAM ajustado: activar/desactivar módulos según el modo en uso.
- WiFi activo es el mayor consumidor de batería — deep sleep no es opcional desde Fase 2.
- La UI siempre debe mostrar un estado de "procesando", nunca quedar congelada.
