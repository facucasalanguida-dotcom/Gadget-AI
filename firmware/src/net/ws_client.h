#pragma once

#include <cstddef>
#include <cstdint>
#include <functional>

// Único cliente de red del firmware (regla de la Sección 8 de la spec): toda
// comunicación ESP32<->backend pasa por acá. Facilita testear y cambiar de
// protocolo sin tocar ui/, audio/ ni sensors/.

namespace net {

using TextMessageHandler = std::function<void(const char *json_payload)>;

bool connect(const char *host, uint16_t port, const char *path);
void loop(); // llamar en cada iteración del loop principal
bool is_connected();

// Envía audio grabado al backend (Fase 1: HTTP multipart a /api/voice).
// Devuelve la respuesta de texto corto en `response_text_out` (buffer del caller).
bool send_voice_and_wait(const uint8_t *pcm_buffer, size_t length,
                          char *response_text_out, size_t response_text_capacity);

// Registra el handler para eventos push del backend (alertas, Fase 2+) que llegan
// por el WebSocket persistente.
void on_push_event(TextMessageHandler handler);

} // namespace net
