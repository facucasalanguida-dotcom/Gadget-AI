# sim/

Simulación previa a hardware (spec Sección 9): validar UI y lógica sin placa
física.

## LVGL PC simulator (pendiente de setup local)

El firmware (`firmware/src/ui/ui.cpp`) está escrito contra la API pura de
LVGL 8.x sin llamadas directas a drivers de pantalla/touch, para poder
compilarse tanto contra el target real (`esp32-s3-devkit`) como contra un
simulador de PC (SDL2). Para levantarlo localmente:

1. Clonar el proyecto oficial `lvgl/lv_port_pc_eclipse` (o el simulador SDL2
   equivalente) como referencia de `main.c`/CMake.
2. Apuntar su `lv_conf.h` al mismo que usa `firmware/` y linkear
   `firmware/src/ui/ui.cpp` + un `main` que llame `ui::init_home_screen(...)`.
3. `lv_timer_handler()` en el loop, igual que en `firmware/src/main.cpp`.

No se generó el proyecto SDL2 completo en este repo porque requiere un
entorno gráfico (SDL2 + toolchain nativo) que este entorno de desarrollo
remoto no tiene disponible para validarlo. **La forma recomendada de ver el
dispositivo funcionando sin hardware en este proyecto es `mobile-app/`**
(desplegable en Vercel, sin dependencias nativas) — ver su README.

## Wokwi

Para lógica de firmware no gráfica (parseo, colas, estado — Fase 2+), usar
[Wokwi](https://wokwi.com/) con un proyecto ESP32-S3 + `diagram.json` propio
una vez que haya lógica de ese tipo que lo justifique (ver
`firmware/test/README.md`).
