# sensors/

Vacío a propósito. Alcance previsto (ver `docs/spec.md`):

- **Fase 3**: nada nuevo acá (wake word vive en `audio/`, VAD local idem).
- **Fase 4**: cámara (consulta visual bajo demanda), sensor ambiental BME680,
  lector NFC para rutinas por tag.

No implementar antes de cerrar el criterio de aceptación de la Fase 3.
Cuando corresponda, seguir la misma convención que `audio/` y `ui/`: un
módulo por responsabilidad (`camera.h/.cpp`, `bme680.h/.cpp`, `nfc.h/.cpp`),
sin lógica de red directa — todo pasa por `net/`.
