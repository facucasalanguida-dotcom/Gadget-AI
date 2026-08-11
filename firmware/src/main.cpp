// Fase 1 — Base funcional: voz + pantalla táctil, sin proactividad ni batería.
//
// Criterio de aceptación (docs/spec.md, Sección 7): apretar el botón, hablar,
// y que el dispositivo responda por voz y/o texto en pantalla usando el
// backend real (no mockeado).

#include <Arduino.h>
#include <WiFi.h>
#include <lvgl.h>

#include "audio/audio_capture.h"
#include "config.h"
#include "net/ws_client.h"
#include "ui/ui.h"

namespace {

lv_disp_draw_buf_t draw_buf;
lv_color_t draw_buf_pixels[SCREEN_WIDTH * 10];

uint8_t *record_buffer = nullptr;
char response_buffer[256];

const ui::ActionCardSpec kActionCards[] = {
    {"status", "Estado", LV_SYMBOL_HOME},
    {"ask", "Preguntar", LV_SYMBOL_KEYBOARD},
    {"routine", "Rutina", LV_SYMBOL_LIST},
};

void on_card_tap(const char *action_id) {
    // Fase 1: cualquier tarjeta reusa el mismo flujo de voz (el texto de la
    // acción se antepone al prompt en el backend). Diferenciación real de
    // acciones queda para cuando haya tool calling específico por tarjeta.
    ui::set_response_text("Mantené presionado el boton BOOT para hablar...");
}

void connect_wifi() {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
        delay(250);
    }
}

void handle_push_event(const char *json_payload) {
    // Fase 2 conectará esto a alertas reales; en Fase 1 sólo lo logueamos.
    Serial.printf("[push] %s\n", json_payload);
}

void capture_and_send_voice() {
    ui::set_processing(true);

    size_t bytes = audio::record_pcm(record_buffer, audio::max_buffer_size());
    bool ok = false;
    if (bytes > 0) {
        ok = net::send_voice_and_wait(record_buffer, bytes, response_buffer,
                                       sizeof(response_buffer));
    }

    ui::set_processing(false);
    ui::set_response_text(ok ? response_buffer
                              : "No se pudo contactar al backend.");
}

} // namespace

void setup() {
    Serial.begin(115200);

    record_buffer = static_cast<uint8_t *>(malloc(audio::max_buffer_size()));

    lv_init();
    lv_disp_draw_buf_init(&draw_buf, draw_buf_pixels, nullptr,
                           SCREEN_WIDTH * 10);
    // NOTA: la inicialización real del panel (lv_disp_drv_register con los
    // callbacks de flush para el ST7796, más el driver de touch GT911) queda
    // pendiente de los pines confirmados en docs/hardware-notes.md. Sin eso,
    // este `setup()` compila la lógica de aplicación pero no dibuja en un
    // panel físico todavía.

    ui::init_home_screen(kActionCards,
                          sizeof(kActionCards) / sizeof(kActionCards[0]),
                          on_card_tap);
    ui::set_metric("Backend", BACKEND_HOST);

    pinMode(BUTTON_RECORD_PIN_TBD, INPUT_PULLUP);

    connect_wifi();
    audio::init();

    char ws_path[64];
    snprintf(ws_path, sizeof(ws_path), "%s", BACKEND_WS_PATH);
    net::connect(BACKEND_HOST, BACKEND_PORT, ws_path);
    net::on_push_event(handle_push_event);
}

void loop() {
    lv_timer_handler();
    net::loop();

    static bool was_pressed = false;
    bool is_pressed = digitalRead(BUTTON_RECORD_PIN_TBD) == LOW;
    if (is_pressed && !was_pressed) {
        capture_and_send_voice();
    }
    was_pressed = is_pressed;

    static uint32_t last_clock_update = 0;
    if (millis() - last_clock_update > 1000) {
        last_clock_update = millis();
        // Fase 1: sin RTC/NTP todavía — placeholder hasta que se agregue
        // sincronización horaria real.
    }

    delay(5);
}
