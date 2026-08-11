#include "power.h"
#include "config.h"

#include <Arduino.h>
#include <esp_sleep.h>

namespace power {

namespace {
uint32_t last_activity_ms = 0;

uint8_t voltage_to_percent(float voltage) {
    const float kEmpty = 3.3f;
    const float kFull = 4.2f;
    if (voltage <= kEmpty) return 0;
    if (voltage >= kFull) return 100;
    return static_cast<uint8_t>((voltage - kEmpty) / (kFull - kEmpty) * 100.0f);
}
} // namespace

bool init() {
    pinMode(BATTERY_ADC_PIN_TBD, INPUT);
    last_activity_ms = millis();
    return true;
}

float read_battery_voltage() {
    // ESP32-S3 ADC: 12 bits, referencia ~3.3V. El divisor resistivo asumido
    // (BATTERY_DIVIDER_RATIO_TBD) es un placeholder — confirmar contra el
    // esquemático real antes de confiar en el valor absoluto.
    int raw = analogRead(BATTERY_ADC_PIN_TBD);
    float pin_voltage = (raw / 4095.0f) * 3.3f;
    return pin_voltage * BATTERY_DIVIDER_RATIO_TBD;
}

uint8_t read_battery_percent() { return voltage_to_percent(read_battery_voltage()); }

void notice_activity() { last_activity_ms = millis(); }

void maybe_deep_sleep() {
    uint32_t idle_ms = millis() - last_activity_ms;
    if (idle_ms < static_cast<uint32_t>(DEEP_SLEEP_TIMEOUT_S) * 1000) return;

    // TBD: sumar wakeup por GPIO (botón/INT táctil) una vez confirmados esos
    // pines — hoy sólo se despierta por timer, así que puede tardar hasta
    // DEEP_SLEEP_WAKE_INTERVAL_S en reaccionar a una interacción real.
    esp_sleep_enable_timer_wakeup(static_cast<uint64_t>(DEEP_SLEEP_WAKE_INTERVAL_S) *
                                   1000000ULL);
    esp_deep_sleep_start();
}

} // namespace power
