#pragma once

#include <cstdint>

// Fase 2: lectura de batería + deep sleep tras inactividad. Ver
// docs/spec.md Sección 7 y config.h para los pines/constantes (varios
// marcados TBD — no confiar en el valor absoluto de voltaje/porcentaje
// hasta confirmar el divisor resistivo real contra el esquemático).

namespace power {

bool init();

float read_battery_voltage();

// Porcentaje aproximado (curva lineal 3.3V-4.2V de una LiPo 1S típica; no
// es un fuel gauge real).
uint8_t read_battery_percent();

// Llamar en cada interacción del usuario (botón, touch) para resetear el
// contador de inactividad.
void notice_activity();

// Llamar periódicamente desde el loop principal. Entra en deep sleep si
// pasaron más de DEEP_SLEEP_TIMEOUT_S segundos desde la última actividad.
void maybe_deep_sleep();

} // namespace power
