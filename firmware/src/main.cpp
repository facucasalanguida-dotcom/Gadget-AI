// Fase 1 — Base funcional: voz + pantalla táctil.
// Fase 2 — Proactividad (alertas push del backend) + energía (batería, deep
// sleep). Ver docs/spec.md Sección 7 para el criterio de aceptación de cada
// fase.

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <cstring>
#include <lvgl.h>

#include "audio/audio_capture.h"
#include "config.h"
#include "net/ws_client.h"
#include "power/power.h"
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
    power::notice_activity();
    // Fase 1: cualquier tarjeta reusa el mismo flujo de voz (el texto de la
    // acción se antepone al prompt en el backend). Diferenciación real de
    // acciones queda para cuando haya tool calling específico por tarjeta.
    ui::set_response_text("Mantené presionado el boton BOOT para hablar...");
}

// Patrón simple de parpadeo por categoría de alerta (Fase 2). Vive acá (no
// en ui/, que sólo toca LVGL, ni en power/, que es batería/sleep) porque es
// puro glue de GPIO para un evento puntual. LED RGB asumido como 3 canales
// PWM simples -- ver config.h y docs/hardware-notes.md, sin confirmar.
void flash_alert_led(const char *category) {
    bool is_below = category && strcmp(category, "price_below") == 0;
    for (int i = 0; i < 3; ++i) {
        digitalWrite(LED_RGB_R_PIN_TBD, is_below ? HIGH : LOW);
        digitalWrite(LED_RGB_G_PIN_TBD, is_below ? LOW : HIGH);
        delay(150);
        digitalWrite(LED_RGB_R_PIN_TBD, LOW);
        digitalWrite(LED_RGB_G_PIN_TBD, LOW);
        delay(150);
    }
    // NOTA: la spec (Sección 7, Fase 2) también pide vibración por patrón,
    // pero el listado de hardware on-board (Sección 2) no incluye un motor
    // de vibración -- no se asume acá. Confirmar en docs/hardware-notes.md
    // si la placa real lo tiene antes de agregar ese driver.
}

void connect_wifi() {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
        delay(250);
    }
}

void handle_push_event(const char *json_payload) {
    // Formato esperado (ver backend/src/polling/engine.ts::Alert, enviado
    // por backend/src/api/push.ts): {"type":"alert","payload":{"category":
    // "price_above"|"price_below","assetId":...,"price":...,"threshold":...}}
    JsonDocument doc;
    if (deserializeJson(doc, json_payload) != DeserializationError::Ok) {
        Serial.printf("[push] no se pudo parsear: %s\n", json_payload);
        return;
    }
    const char *type = doc["type"] | "";
    if (strcmp(type, "alert") != 0) return;

    const char *category = doc["payload"]["category"] | "alert";
    const char *asset_id = doc["payload"]["assetId"] | "?";
    double price = doc["payload"]["price"] | 0.0;

    char body[96];
    snprintf(body, sizeof(body), "%s: %.2f", asset_id, price);
    ui::show_alert_banner("Alerta", body);
    flash_alert_led(category);
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
    pinMode(LED_RGB_R_PIN_TBD, OUTPUT);
    pinMode(LED_RGB_G_PIN_TBD, OUTPUT);
    pinMode(LED_RGB_B_PIN_TBD, OUTPUT);

    connect_wifi();
    audio::init();
    power::init();
    ui::set_battery(power::read_battery_percent());

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
        power::notice_activity();
        capture_and_send_voice();
    }
    was_pressed = is_pressed;

    static uint32_t last_clock_update = 0;
    if (millis() - last_clock_update > 1000) {
        last_clock_update = millis();
        // Fase 1: sin RTC/NTP todavía — placeholder hasta que se agregue
        // sincronización horaria real.
    }

    static uint32_t last_battery_update = 0;
    if (millis() - last_battery_update > 30000) {
        last_battery_update = millis();
        ui::set_battery(power::read_battery_percent());
    }

    power::maybe_deep_sleep();

    delay(5);
}
