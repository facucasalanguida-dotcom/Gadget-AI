#pragma once

#include <lvgl.h>

// UI Fase 1: reloj + 1 métrica + tarjetas de acción táctiles.
// No contiene lógica de negocio ni llamadas de red — sólo construye/actualiza
// widgets LVGL. Los callbacks de tarjetas delegan al módulo net/ vía función
// inyectada, para mantener ui/ testeable de forma aislada.

namespace ui {

using ActionCardCallback = void (*)(const char *action_id);

struct ActionCardSpec {
    const char *id;
    const char *label;
    const char *icon; // símbolo LVGL (LV_SYMBOL_*) o glyph corto
};

// Inicializa la pantalla principal: reloj, métrica destacada y N tarjetas de acción.
// `on_card_tap` se invoca con el id de la tarjeta tocada.
void init_home_screen(const ActionCardSpec *cards, size_t card_count,
                       ActionCardCallback on_card_tap);

// Actualiza el reloj (llamar 1x por segundo desde el loop principal).
void set_clock(int hour, int minute);

// Actualiza el valor de la métrica destacada (ej. batería, precio, temperatura).
void set_metric(const char *label, const char *value);

// Muestra/oculta el indicador de "procesando" (nunca dejar la UI congelada en
// silencio mientras se espera al backend — ver Sección 10 de la spec).
void set_processing(bool processing);

// Muestra la última respuesta de texto corto recibida del backend.
void set_response_text(const char *text);

// Dispara un toast/banner de alerta (usado desde Fase 2 en adelante).
void show_alert_banner(const char *title, const char *body);

} // namespace ui
