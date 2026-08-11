#include "audio_capture.h"
#include "config.h"

#include <driver/i2s.h>

namespace audio {

namespace {
constexpr i2s_port_t MIC_PORT = I2S_NUM_0;
constexpr i2s_port_t SPK_PORT = I2S_NUM_1;
bool initialized = false;
} // namespace

size_t max_buffer_size() {
    return static_cast<size_t>(AUDIO_SAMPLE_RATE) * (AUDIO_BITS_PER_SAMPLE / 8) *
           AUDIO_MAX_RECORD_SECONDS;
}

bool init() {
    i2s_config_t mic_config = {
        .mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_RX),
        .sample_rate = AUDIO_SAMPLE_RATE,
        .bits_per_sample = static_cast<i2s_bits_per_sample_t>(AUDIO_BITS_PER_SAMPLE),
        .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
        .communication_format = I2S_COMM_FORMAT_STAND_I2S,
        .intr_alloc_flags = 0,
        .dma_buf_count = 4,
        .dma_buf_len = 256,
        .use_apll = false,
    };
    i2s_pin_config_t mic_pins = {
        .bck_io_num = I2S_MIC_SCK_TBD,
        .ws_io_num = I2S_MIC_WS_TBD,
        .data_out_num = I2S_PIN_NO_CHANGE,
        .data_in_num = I2S_MIC_SD_TBD,
    };

    if (i2s_driver_install(MIC_PORT, &mic_config, 0, nullptr) != ESP_OK) return false;
    if (i2s_set_pin(MIC_PORT, &mic_pins) != ESP_OK) return false;

    i2s_config_t spk_config = mic_config;
    spk_config.mode = static_cast<i2s_mode_t>(I2S_MODE_MASTER | I2S_MODE_TX);
    i2s_pin_config_t spk_pins = {
        .bck_io_num = I2S_SPK_BCLK_TBD,
        .ws_io_num = I2S_SPK_LRC_TBD,
        .data_out_num = I2S_SPK_DOUT_TBD,
        .data_in_num = I2S_PIN_NO_CHANGE,
    };
    if (i2s_driver_install(SPK_PORT, &spk_config, 0, nullptr) != ESP_OK) return false;
    if (i2s_set_pin(SPK_PORT, &spk_pins) != ESP_OK) return false;

    initialized = true;
    return true;
}

size_t record_pcm(uint8_t *out_buffer, size_t out_buffer_capacity) {
    if (!initialized || !out_buffer) return 0;

    size_t total_read = 0;
    size_t bytes_read = 0;
    while (total_read < out_buffer_capacity) {
        esp_err_t err = i2s_read(MIC_PORT, out_buffer + total_read,
                                  out_buffer_capacity - total_read, &bytes_read,
                                  pdMS_TO_TICKS(100));
        if (err != ESP_OK || bytes_read == 0) break;
        total_read += bytes_read;
    }
    return total_read;
}

bool play_pcm(const uint8_t *buffer, size_t length) {
    if (!initialized || !buffer) return false;
    size_t bytes_written = 0;
    esp_err_t err = i2s_write(SPK_PORT, buffer, length, &bytes_written, portMAX_DELAY);
    return err == ESP_OK && bytes_written == length;
}

} // namespace audio
