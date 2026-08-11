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

## Estado: Fase 1 y Fase 2 implementadas (voz + pantalla, proactividad + energía)

Fase 1 (tag `fase-1-completa`) y Fase 2 (alertas por polling + batería/deep
sleep) están implementadas en código. Fase 2 **no está validada en hardware
real** — no hay placa física ni PlatformIO en este entorno de desarrollo, así
que "sobrevive horas con batería mostrando el nivel correctamente" (el
criterio de aceptación completo) queda pendiente de probar en la placa.

Las Fases 3 y 4 están scaffoldeadas (carpetas + README con el alcance
previsto) pero **no implementadas todavía**, siguiendo la regla del propio
`CLAUDE.md`: no adelantar una fase sin cerrar el criterio de aceptación de
la anterior. Ver `docs/spec.md` Sección 7 para el detalle de cada fase.

## Fase 2 — Alertas proactivas + batería

- **Backend**: `backend/src/polling/` consulta una fuente configurable (por
  default, precio de un activo vía CoinGecko, gratis y sin API key) y empuja
  una alerta por WebSocket (`backend/src/api/push.ts`, ya existía desde
  Fase 1) sólo al cruzar un umbral configurado — no en cada poll. Se activa
  completando `POLLING_ASSET_ID` + `POLLING_ALERT_ABOVE`/`POLLING_ALERT_BELOW`
  en `backend/.env`.
- **Firmware**: `firmware/src/power/` lee el voltaje de batería (ADC, pin
  TBD) y calcula un % aproximado; entra en deep sleep tras
  `DEEP_SLEEP_TIMEOUT_S` segundos de inactividad. `main.cpp` muestra el %
  en pantalla y parpadea el LED RGB al recibir una alerta push. El motor de
  vibración que menciona la spec **no se implementó**: la placa no lo tiene
  confirmado como periférico on-board (ver `docs/hardware-notes.md`).
- **mobile-app**: batería simulada en pantalla (no hay batería real en un
  navegador) y un banner de alerta proactiva.

### Probar la alerta — directo en la demo de Vercel, sin nada más

`mobile-app/app/api/alerts/route.ts` es un endpoint serverless (corre en la
misma app de Vercel, sin backend aparte) que chequea el precio de un activo
vía CoinGecko; la app lo pollea sola cada 15s y muestra el banner al cruzar
el umbral. Sólo hace falta cargar en Vercel (Settings → Environment
Variables):

```
ALERT_ASSET_ID=bitcoin
ALERT_ABOVE=1
```

(`ALERT_ABOVE=1` dispara casi al toque, porque cualquier cripto vale más de
1 USD — es a propósito, para verlo sin esperar). Redeploy y listo.

### Probar el flujo con el backend real (como lo vería el ESP32)

Esto usa el WebSocket persistente de `backend/` en vez del polling
client-side — hace falta correrlo aparte (Vercel serverless no sostiene un
WebSocket persistente):

```bash
# Terminal 1 — backend con polling activo
cd backend
cp .env.example .env   # completar GEMINI_API_KEY + POLLING_ASSET_ID=bitcoin + POLLING_ALERT_ABOVE=1
npm install && npm run dev

# Terminal 2 — mobile-app apuntando a ese backend
cd mobile-app
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8787" >> .env.local
npm install && npm run dev
```

## Cómo probar el proyecto hoy (sin hardware) — recomendado para empezar

La forma más rápida de ver el agente funcionando es la **app móvil web**
(`mobile-app/`), pensada exactamente para esto: validar voz + pantalla +
respuestas del backend antes de tocar una placa física.

**Demo desplegada:** https://gadget-ai-ivory.vercel.app

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
