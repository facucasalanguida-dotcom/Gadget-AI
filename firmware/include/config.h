#pragma once

// ---------------------------------------------------------------------------
// Configuración del dispositivo — Fase 1
//
// Todos los pines marcados "TBD" son PLACEHOLDERS: no están confirmados contra
// el manual oficial de Freenove para esta SKU de CYD. Ver docs/hardware-notes.md.
// No flashear a hardware real hasta confirmar estos valores.
// ---------------------------------------------------------------------------

// --- WiFi ---
#define WIFI_SSID "TU_WIFI_SSID"
#define WIFI_PASSWORD "TU_WIFI_PASSWORD"

// --- Backend ---
#define BACKEND_HOST "192.168.1.100"   // IP/host del backend en tu red local
#define BACKEND_PORT 8787
#define BACKEND_WS_PATH "/ws/device"
#define BACKEND_VOICE_HTTP_PATH "/api/voice"

// --- Pantalla (ST7796, SPI) — pines TBD, confirmar contra manual Freenove ---
#define TFT_MISO_TBD 12
#define TFT_MOSI_TBD 11
#define TFT_SCLK_TBD 14
#define TFT_CS_TBD   10
#define TFT_DC_TBD   13
#define TFT_RST_TBD  9
#define TFT_BL_TBD   2

// --- Touch (GT911, I2C) — pines TBD ---
#define TOUCH_SDA_TBD 6
#define TOUCH_SCL_TBD 7
#define TOUCH_INT_TBD 5
#define TOUCH_RST_TBD 4

// --- Audio I2S (mic + speaker) — pines TBD ---
#define I2S_MIC_WS_TBD    15
#define I2S_MIC_SD_TBD    16
#define I2S_MIC_SCK_TBD   17
#define I2S_SPK_DOUT_TBD  18
#define I2S_SPK_BCLK_TBD  8
#define I2S_SPK_LRC_TBD   3

// --- Botón físico de captura de voz (Fase 1, reemplazado por wake word en Fase 3) ---
#define BUTTON_RECORD_PIN_TBD 0  // BOOT button como placeholder

// --- LED RGB on-board — pines TBD. Asumido como 3 canales GPIO simples
// (PWM directo); podría ser en cambio un LED addressable (WS2812) de un solo
// pin de datos — confirmar contra el manual antes de dar por buena esta forma. ---
#define LED_RGB_R_PIN_TBD 47
#define LED_RGB_G_PIN_TBD 21
#define LED_RGB_B_PIN_TBD 14

// --- Audio ---
#define AUDIO_SAMPLE_RATE 16000
#define AUDIO_BITS_PER_SAMPLE 16
#define AUDIO_MAX_RECORD_SECONDS 8

// --- Pantalla lógica ---
#define SCREEN_WIDTH 480
#define SCREEN_HEIGHT 320

// --- Batería (Fase 2) — pin ADC y ratio del divisor resistivo sin confirmar
// contra el esquemático real; el % resultante es aproximado hasta entonces. ---
#define BATTERY_ADC_PIN_TBD 1
#define BATTERY_DIVIDER_RATIO_TBD 2.0f

// --- Energía (Fase 2) ---
// Segundos de inactividad (sin tocar pantalla ni botón) antes de entrar en
// deep sleep.
#define DEEP_SLEEP_TIMEOUT_S 120
// Cada cuánto se despierta brevemente en deep sleep para poder recibir un
// push del backend (trade-off consumo/latencia — sin ajustar todavía).
#define DEEP_SLEEP_WAKE_INTERVAL_S 30
