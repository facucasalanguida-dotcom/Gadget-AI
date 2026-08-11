#include "ws_client.h"
#include "config.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include <WiFi.h>

namespace net {

namespace {
WebSocketsClient ws_client;
TextMessageHandler push_handler = nullptr;
bool connected = false;

void handle_ws_event(WStype_t type, uint8_t *payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            connected = true;
            break;
        case WStype_DISCONNECTED:
            connected = false;
            break;
        case WStype_TEXT:
            if (push_handler) {
                push_handler(reinterpret_cast<const char *>(payload));
            }
            break;
        default:
            break;
    }
}
} // namespace

bool connect(const char *host, uint16_t port, const char *path) {
    ws_client.begin(host, port, path);
    ws_client.onEvent(handle_ws_event);
    ws_client.setReconnectInterval(3000);
    return true;
}

void loop() { ws_client.loop(); }

bool is_connected() { return connected; }

void on_push_event(TextMessageHandler handler) { push_handler = handler; }

bool send_voice_and_wait(const uint8_t *pcm_buffer, size_t length,
                          char *response_text_out, size_t response_text_capacity) {
    if (WiFi.status() != WL_CONNECTED) {
        if (response_text_capacity > 0) response_text_out[0] = '\0';
        return false;
    }

    HTTPClient http;
    char url[128];
    snprintf(url, sizeof(url), "http://%s:%d%s", BACKEND_HOST, BACKEND_PORT,
              BACKEND_VOICE_HTTP_PATH);

    http.begin(url);
    http.addHeader("Content-Type", "application/octet-stream");
    int status_code = http.POST(const_cast<uint8_t *>(pcm_buffer), length);

    bool ok = false;
    if (status_code == 200) {
        String body = http.getString();
        JsonDocument doc; // ArduinoJson v7
        if (deserializeJson(doc, body) == DeserializationError::Ok) {
            const char *text = doc["response_text"] | "";
            strncpy(response_text_out, text, response_text_capacity - 1);
            response_text_out[response_text_capacity - 1] = '\0';
            ok = true;
        }
    }

    http.end();
    return ok;
}

} // namespace net
