#pragma once

#include <cstddef>
#include <cstdint>

// Captura de audio por I2S, disparada por botón físico en Fase 1
// (reemplazado por wake word local en Fase 3 — ver docs/spec.md).
//
// No implementa wake word, VAD ni STT: sólo produce un buffer PCM crudo que
// net/ envía al backend, que es quien transcribe.

namespace audio {

bool init();

// Graba hasta AUDIO_MAX_RECORD_SECONDS o hasta que el botón se suelte.
// Devuelve el tamaño en bytes escrito en `out_buffer` (buffer provisto por el caller,
// dimensionado con audio::max_buffer_size()).
size_t record_pcm(uint8_t *out_buffer, size_t out_buffer_capacity);

size_t max_buffer_size();

// Reproduce un buffer PCM/WAV recibido del backend (respuesta TTS).
bool play_pcm(const uint8_t *buffer, size_t length);

} // namespace audio
