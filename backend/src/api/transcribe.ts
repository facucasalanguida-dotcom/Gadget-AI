// STT (speech-to-text) — Fase 1.
//
// La spec no fija un proveedor de STT ("Backend transcribe (STT)", Sección 3,
// sin especificar cuál). Elegir vendor es una decisión de producto/costo que
// no corresponde asumir acá. Interfaz pluggable: hoy sólo soporta el caso
// donde el audio ya viene transcripto (mobile-app usa Web Speech API en el
// browser). Para el ESP32 real, implementar `transcribePcm` con el proveedor
// que se confirme (ej. Whisper API, Deepgram, local whisper.cpp) antes de
// cerrar el criterio de aceptación de Fase 1 en hardware real.

export async function transcribePcm(_pcmBuffer: Buffer): Promise<string> {
  throw new Error(
    "STT de audio PCM crudo (ESP32) no implementado todavia: falta elegir " +
      "proveedor de STT. Ver backend/src/api/transcribe.ts. Para probar el " +
      "flujo end-to-end hoy, usar mobile-app/ (transcribe en el browser) o " +
      "enviar {\"text\": \"...\"} directamente a POST /api/voice."
  );
}
