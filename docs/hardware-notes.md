# Notas de hardware — Freenove CYD (ESP32-S3, 3.5" IPS táctil)

Este archivo es la fuente de verdad de pines/ICs para el firmware. **No escribir
drivers de bajo nivel (pantalla/touch/audio) sin haber marcado la fila correspondiente
como "Confirmado".** Mientras esté "Pendiente", el código debe tratarlo como un valor
de configuración (`include/config.h`) fácil de corregir, nunca hardcodeado en varios
lugares.

## Estado de confirmación

| Item | Valor asumido en este repo (por confirmar) | Estado | Fuente a consultar |
|---|---|---|---|
| Driver LCD | ST7796 (SPI) | Pendiente | Manual/repo oficial Freenove para la SKU exacta |
| Driver touch | GT911 (I2C) o XPT2046 (SPI), según revisión | Pendiente | Idem |
| Pinout GPIO completo (LCD, touch, I2S mic/speaker, LED RGB, botones, batería) | Ver `firmware/include/config.h` (placeholders) | Pendiente | Idem |
| Conector de batería | JST 1.25mm (JST-SH), 2 o 4 pines | Parcialmente confirmado por spec — verificar cantidad de pines contra la unidad física | Datasheet / inspección física |
| PSRAM/Flash | 8MB PSRAM / 16MB Flash | Asumido (variante recomendada por spec) | Confirmar SKU comprada |

## Cómo actualizar este archivo

1. Conseguir el manual oficial / repositorio de ejemplos de Freenove para la SKU
   exacta de la placa.
2. Reemplazar cada fila "Pendiente" por "Confirmado" con el valor real y un link/nota
   de la fuente.
3. Actualizar `firmware/include/config.h` con los valores confirmados.
4. Recién ahí escribir/ajustar los drivers en `firmware/src/ui/` y `firmware/src/audio/`.

No hay placa física conectada a este entorno de desarrollo remoto — todo el firmware
en este repo se escribió siguiendo los patrones estándar de Arduino+LVGL para paneles
ST7796/GT911, pero **no fue compilado con el toolchain de PlatformIO ni probado en
hardware real**. Confirmar con `pio run -e esp32-s3-devkit` en una máquina con
PlatformIO instalado antes de flashear.
