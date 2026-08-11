# firmware/test/

Espacio para tests unitarios de lógica pura del firmware que no dependen de
hardware (parseo, colas, estado — ver `docs/spec.md` Sección 9), usando el
target `native-sim` de `platformio.ini` (PlatformIO's native/Unity test
runner) o el simulador de PC de LVGL.

Sin tests todavía: la Fase 1 no introdujo lógica de parseo/estado compleja
que lo justifique (es UI + captura + un POST). A partir de Fase 2 (cola de
alertas, umbral) y Fase 3 (cola offline, caché) esto sí debería tener
cobertura real antes de considerarse "terminado" según CLAUDE.md.
