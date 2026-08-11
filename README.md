# Agente IA Portátil — ESP32-S3

Agente de IA portátil sobre una placa ESP32-S3 con pantalla táctil (familia
Freenove CYD, 3.5" IPS capacitiva) que actúa como terminal físico de un
backend propio orquestando la API de Claude con tool calling. Ver la
especificación completa en [`docs/spec.md`](docs/spec.md) y las reglas
persistentes del proyecto en [`CLAUDE.md`](CLAUDE.md).

## Estructura

```
firmware/    → C++ (PlatformIO + Arduino + LVGL) que corre en el ESP32-S3
backend/     → Node.js/TypeScript: orquestación Claude API + tool calling + MCP
mobile-app/  → Next.js, desplegable en Vercel: simula el dispositivo sin hardware
sim/         → notas de simulación (LVGL PC simulator, Wokwi)
docs/        → spec completa + notas de hardware a confirmar
```

## Estado: Fase 1 completa (voz + pantalla táctil básica)

Las Fases 2 a 4 están scaffoldeadas (carpetas + README con el alcance
previsto) pero **no implementadas todavía**, siguiendo la regla del propio
`CLAUDE.md`: no adelantar una fase sin cerrar el criterio de aceptación de
la anterior. Ver `docs/spec.md` Sección 7 para el detalle de cada fase.

## Cómo probar el proyecto hoy (sin hardware) — recomendado para empezar

La forma más rápida de ver el agente funcionando es la **app móvil web**
(`mobile-app/`), pensada exactamente para esto: validar voz + pantalla +
respuestas del backend antes de tocar una placa física.

### Opción A — Deploy en Vercel (para probarlo desde el celular)

1. Este repo ya está en GitHub. En [vercel.com/new](https://vercel.com/new)
   importalo, con **Root Directory = `mobile-app`**.
2. Agregá la variable de entorno `GEMINI_API_KEY` en Vercel — es **gratis,
   sin tarjeta de crédito**, conseguila en
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. Deploy. Abrí la URL desde el celular (Chrome/Android para que ande el
   micrófono; en iOS/Safari queda el campo de texto como fallback).

Detalle completo en [`mobile-app/README.md`](mobile-app/README.md).

### Opción B — Local

```bash
cd mobile-app
cp .env.example .env.local   # completar GEMINI_API_KEY (gratis, sin tarjeta)
npm install
npm run dev
# abrir http://localhost:3000
```

## Motor de IA: Gemini (gratis) por default, Anthropic opcional

Tanto `backend/` como `mobile-app/` orquestan tool calling contra un motor de
IA elegido por la variable `AI_PROVIDER`:

- **`gemini`** (default) — [Google Gemini API](https://aistudio.google.com/apikey),
  gratis y sin tarjeta de crédito. Es el que conviene para probar el proyecto.
- **`anthropic`** — API de pago de Anthropic (`ANTHROPIC_API_KEY`), si ya la
  usás en otros productos y preferís mantener todo con el mismo proveedor.

Ver `backend/src/orchestrator/` y `mobile-app/lib/` (`providers/gemini.ts`,
`providers/anthropic.ts`) — misma interfaz, ambos con tool calling real.

## Backend real (el que eventualmente habla con el ESP32)

```bash
cd backend
cp .env.example .env   # completar GEMINI_API_KEY (gratis, sin tarjeta)
npm install
npm test    # corre los tests del orquestador (tool calling) con los proveedores mockeados
npm run dev # levanta en http://localhost:8787
```

`POST /api/voice` con `{"text": "..."}` para probarlo manualmente:

```bash
curl -X POST http://localhost:8787/api/voice \
  -H "Content-Type: application/json" \
  -d '{"text": "¿qué hora es?"}'
```

## Firmware (ESP32-S3 real)

Requiere [PlatformIO Core](https://platformio.org/install/cli) y la placa
conectada por USB-C. **No compilado ni probado en hardware real en este
entorno de desarrollo** (sin PlatformIO/toolchain Xtensa disponible acá) —
ver [`docs/hardware-notes.md`](docs/hardware-notes.md) para el estado de
confirmación de pines/ICs, que hay que cerrar antes de flashear.

```bash
cd firmware
pio run -e esp32-s3-devkit           # compilar
pio run -e esp32-s3-devkit -t upload # flashear
pio device monitor                   # logs en vivo
```

Antes de flashear, completar en `firmware/include/config.h`: SSID/password
de WiFi y la IP/host del backend (`BACKEND_HOST`).

## Reglas del proyecto

Ver [`CLAUDE.md`](CLAUDE.md) — resumen: el ESP32 es un cliente ligero (todo
el razonamiento vive en `backend/`), confirmar pines/ICs contra la fuente
oficial de Freenove antes de escribir drivers de bajo nivel, y validar en
simulador antes de pedir flasheo a hardware real.
