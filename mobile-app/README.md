# mobile-app — simulador del dispositivo

App web (Next.js) que imita la pantalla táctil 480x320 del Freenove CYD:
reloj, tarjetas de acción, botón de voz (Web Speech API del navegador) y
respuesta del agente (texto + voz vía `speechSynthesis`). Pensada para
validar el flujo de la **Fase 1** end-to-end desde el celular, antes de
tener el hardware armado.

Por defecto es **autocontenida**: llama directo a la API del motor de IA
elegido desde su propia API route (`app/api/voice/route.ts`), sin depender
de que `backend/` esté desplegado en otro lado. Si preferís que hable con
el `backend/` real (por ejemplo para probar alertas push de Fase 2 en el
futuro), seteá `NEXT_PUBLIC_BACKEND_URL`.

## Motor de IA: Gemini (gratis) por default, Anthropic opcional

`AI_PROVIDER` elige el motor (`lib/ai.ts` despacha a `lib/providers/`):

- **`gemini`** (default) — [Google Gemini API](https://aistudio.google.com/apikey),
  **gratis, sin tarjeta de crédito**. Es lo que necesitás para probar la app
  sin gastar nada.
- **`anthropic`** — requiere una API key de pago de
  [console.anthropic.com](https://console.anthropic.com/).

## Desarrollo local

```bash
cd mobile-app
cp .env.example .env.local   # completar GEMINI_API_KEY (gratis)
npm install
npm run dev
```

Abrir `http://localhost:3000` (probar en Chrome/Android para que ande el
reconocimiento de voz — Safari/iOS no soporta bien la Web Speech API; ahí
queda el campo de texto como fallback).

## Deploy en Vercel

1. Pushear este repo a GitHub (ya está en la rama del proyecto).
2. En [vercel.com/new](https://vercel.com/new), importar el repo.
3. **Root Directory**: `mobile-app` (importante — el repo es un monorepo con
   `firmware/`, `backend/` y `mobile-app/`; Vercel debe apuntar sólo a esta
   carpeta).
4. Framework preset: Next.js (ya viene forzado por `vercel.json`, no
   depende de la autodetección).
5. Environment Variables: agregar `GEMINI_API_KEY` (gratis, sin tarjeta —
   conseguila en https://aistudio.google.com/apikey). Opcionalmente
   `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` si preferís pagar por Claude.
6. Deploy. Listo — la URL que te da Vercel es el simulador del dispositivo,
   accesible desde el celular.
