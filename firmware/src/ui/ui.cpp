#include "ui.h"

namespace ui {

namespace {
lv_obj_t *screen = nullptr;
lv_obj_t *clock_label = nullptr;
lv_obj_t *metric_label = nullptr;
lv_obj_t *metric_value_label = nullptr;
lv_obj_t *processing_spinner = nullptr;
lv_obj_t *response_label = nullptr;
lv_obj_t *alert_banner = nullptr;
ActionCardCallback card_callback = nullptr;

void card_event_handler(lv_event_t *e) {
    if (lv_event_get_code(e) != LV_EVENT_CLICKED) return;
    const char *id = static_cast<const char *>(lv_event_get_user_data(e));
    if (card_callback && id) {
        card_callback(id);
    }
}

lv_obj_t *make_action_card(lv_obj_t *parent, const ActionCardSpec &spec) {
    lv_obj_t *card = lv_btn_create(parent);
    lv_obj_set_size(card, 140, 90);
    lv_obj_add_event_cb(card, card_event_handler, LV_EVENT_CLICKED,
                         const_cast<char *>(spec.id));

    lv_obj_t *icon = lv_label_create(card);
    lv_label_set_text(icon, spec.icon);
    lv_obj_set_style_text_font(icon, &lv_font_montserrat_24, 0);
    lv_obj_align(icon, LV_ALIGN_TOP_MID, 0, 8);

    lv_obj_t *label = lv_label_create(card);
    lv_label_set_text(label, spec.label);
    lv_obj_align(label, LV_ALIGN_BOTTOM_MID, 0, -8);

    return card;
}
} // namespace

void init_home_screen(const ActionCardSpec *cards, size_t card_count,
                       ActionCardCallback on_card_tap) {
    card_callback = on_card_tap;

    screen = lv_obj_create(nullptr);
    lv_scr_load(screen);

    // Reloj (arriba-izquierda)
    clock_label = lv_label_create(screen);
    lv_obj_set_style_text_font(clock_label, &lv_font_montserrat_28, 0);
    lv_obj_align(clock_label, LV_ALIGN_TOP_LEFT, 12, 8);
    lv_label_set_text(clock_label, "--:--");

    // Métrica destacada (arriba-derecha)
    metric_label = lv_label_create(screen);
    lv_obj_align(metric_label, LV_ALIGN_TOP_RIGHT, -12, 8);
    lv_label_set_text(metric_label, "");

    metric_value_label = lv_label_create(screen);
    lv_obj_set_style_text_font(metric_value_label, &lv_font_montserrat_28, 0);
    lv_obj_align_to(metric_value_label, metric_label, LV_ALIGN_OUT_BOTTOM_RIGHT, 0, 2);
    lv_label_set_text(metric_value_label, "--");

    // Fila de tarjetas de acción (centro)
    lv_obj_t *row = lv_obj_create(screen);
    lv_obj_remove_style_all(row);
    lv_obj_set_size(row, LV_PCT(100), 110);
    lv_obj_align(row, LV_ALIGN_CENTER, 0, 10);
    lv_obj_set_flex_flow(row, LV_FLEX_FLOW_ROW);
    lv_obj_set_flex_align(row, LV_FLEX_ALIGN_SPACE_EVENLY, LV_FLEX_ALIGN_CENTER,
                           LV_FLEX_ALIGN_CENTER);

    for (size_t i = 0; i < card_count; ++i) {
        make_action_card(row, cards[i]);
    }

    // Respuesta de texto corto (abajo)
    response_label = lv_label_create(screen);
    lv_label_set_long_mode(response_label, LV_LABEL_LONG_WRAP);
    lv_obj_set_width(response_label, LV_PCT(90));
    lv_obj_align(response_label, LV_ALIGN_BOTTOM_MID, 0, -28);
    lv_label_set_text(response_label, "");

    // Spinner de "procesando" (oculto por default)
    processing_spinner = lv_spinner_create(screen, 1000, 60);
    lv_obj_set_size(processing_spinner, 24, 24);
    lv_obj_align(processing_spinner, LV_ALIGN_BOTTOM_RIGHT, -10, -10);
    lv_obj_add_flag(processing_spinner, LV_OBJ_FLAG_HIDDEN);

    // Banner de alerta (Fase 2+), oculto por default
    alert_banner = lv_obj_create(screen);
    lv_obj_set_size(alert_banner, LV_PCT(100), 40);
    lv_obj_align(alert_banner, LV_ALIGN_TOP_MID, 0, 0);
    lv_obj_add_flag(alert_banner, LV_OBJ_FLAG_HIDDEN);
}

void set_clock(int hour, int minute) {
    if (!clock_label) return;
    char buf[6];
    snprintf(buf, sizeof(buf), "%02d:%02d", hour, minute);
    lv_label_set_text(clock_label, buf);
}

void set_metric(const char *label, const char *value) {
    if (!metric_label || !metric_value_label) return;
    lv_label_set_text(metric_label, label);
    lv_label_set_text(metric_value_label, value);
}

void set_processing(bool processing) {
    if (!processing_spinner) return;
    if (processing) {
        lv_obj_clear_flag(processing_spinner, LV_OBJ_FLAG_HIDDEN);
    } else {
        lv_obj_add_flag(processing_spinner, LV_OBJ_FLAG_HIDDEN);
    }
}

void set_response_text(const char *text) {
    if (!response_label) return;
    lv_label_set_text(response_label, text ? text : "");
}

void show_alert_banner(const char *title, const char *body) {
    if (!alert_banner) return;
    lv_obj_clean(alert_banner);
    lv_obj_t *label = lv_label_create(alert_banner);
    char buf[128];
    snprintf(buf, sizeof(buf), "%s — %s", title, body);
    lv_label_set_text(label, buf);
    lv_obj_center(label);
    lv_obj_clear_flag(alert_banner, LV_OBJ_FLAG_HIDDEN);
}

} // namespace ui
