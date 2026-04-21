// AMcontrol.cpp
// Implementación de la tarea de uplink al servidor vía AM-036.
//
// Arquitectura:
//   - La tarea uplink_manager_task espera bloqueada en xTaskNotifyWait()
//     hasta que la librería SerialAM emite un evento (READY, SEND_OK, ERROR…).
//   - No hay polling activo ni flags globales: la sincronización es 100%
//     mediante TaskNotifications de FreeRTOS (equivalente a interrupciones
//     a nivel de tarea).
//   - La tarea se repite cada TEN_MINUTES_MILLIS usando vTaskDelayUntil().

#include "AMcontrol.h"
#include "network.h"   // shared_queueSize, MAX_CLIENTS, motasDataQueue, etc.
#include "config.h"
#include <ArduinoJson.h>

// ---------------------------------------------------------------------------
// Definición de la instancia única del driver
// ---------------------------------------------------------------------------
SerialAM am036(Serial1, AM_MOSFET_PIN);

// ---------------------------------------------------------------------------
// Constantes de tiempo
// ---------------------------------------------------------------------------
static constexpr uint32_t TWO_MINUTES_MS    =  120000UL;
static constexpr uint32_t TEN_MINUTES_MS    =  600000UL;
static constexpr uint32_t TWELVE_HOURS_MS   = 43200000UL;
static constexpr uint32_t ONE_HOUR_MS       =  3600000UL;

// Timeout máximo esperando READY o SEND_DONE (2 min totales para el ciclo)
static constexpr uint32_t CYCLE_TIMEOUT_MS  = TWO_MINUTES_MS;

// ---------------------------------------------------------------------------
// JSON ficticio del BigPacket (uplink → servidor)
// Sustituir por la función real que serializa motasDataQueue.
// ---------------------------------------------------------------------------
static String buildFakeBigPacket() {
    JsonDocument doc;
    doc["router_id"]  = 1;
    doc["timestamp"]  = millis();

    JsonArray motas = doc["motas"].to<JsonArray>();

    // Mota 1 (ficticia)
    JsonObject m1 = motas.add<JsonObject>();
    m1["id"]  = 10;
    m1["hum"] = 62;
    m1["bat"] = 88;
    m1["lat"] = 40.41650;
    m1["lon"] = -3.70349;

    // Mota 2 (ficticia)
    JsonObject m2 = motas.add<JsonObject>();
    m2["id"]  = 23;
    m2["hum"] = 47;
    m2["bat"] = 71;
    m2["lat"] = 40.41712;
    m2["lon"] = -3.70401;

    String out;
    serializeJson(doc, out);
    return out;
}

// ---------------------------------------------------------------------------
// Parseo de la respuesta del servidor (downlink)
// Aquí se procesarían comandos de configuración enviados por el backend.
// De momento solo los imprime por serie.
// ---------------------------------------------------------------------------
static void parseBigPacketResponse(const String& responseBody) {
    if (responseBody.isEmpty()) {
        Serial.println(F("[AM_CTRL] Sin body de respuesta del servidor."));
        return;
    }

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, responseBody);
    if (err) {
        Serial.printf("[AM_CTRL] Error parseando respuesta: %s\n", err.c_str());
        return;
    }

    Serial.println(F("[AM_CTRL] --- Respuesta del servidor (downlink) ---"));

    // Ejemplo ficticio: el servidor puede devolver conf para el router o motas
    if (doc.containsKey("conf")) {
        for (JsonObject item : doc["conf"].as<JsonArray>()) {
            const char* tg = item["tg"] | "?";
            int         id = item["id"] | 0;
            int         v  = item["v"]  | 0;
            Serial.printf("[AM_CTRL]  target=%s id=%d version=%d\n", tg, id, v);
            // TODO: aplicar configuración real a router/motas
        }
    } else {
        Serial.println(F("[AM_CTRL] Sin conf en la respuesta."));
    }
}

// ---------------------------------------------------------------------------
// Condiciones de envío
// ---------------------------------------------------------------------------
static bool checkConditions(TickType_t firstPktTs, TickType_t lastSendTs) {
    // Condición 1: ≥ 1 hora desde que llegó el primer paquete pendiente
    bool oldPacket = (firstPktTs > 0) &&
                     ((xTaskGetTickCount() - firstPktTs) >= pdMS_TO_TICKS(ONE_HOUR_MS));

    // Condición 2: cola llena (máximo de clientes alcanzado)
    bool queueFull = (shared_queueSize >= MAX_CLIENTS);

    // Condición 3: no se envió nada en las últimas 12 horas (telemetría router)
    bool heartbeat = (lastSendTs == 0) ||
                     ((xTaskGetTickCount() - lastSendTs) >= pdMS_TO_TICKS(TWELVE_HOURS_MS));

    return oldPacket || queueFull || heartbeat;
}

// ---------------------------------------------------------------------------
// Tarea principal de uplink
// ---------------------------------------------------------------------------
static void uplink_manager_task(void* pvParameters) {
    (void)pvParameters;

    TickType_t firstPktTs  = 0; // timestamp (ticks) del paquete más antiguo en cola
    TickType_t lastSendTs  = 0; // timestamp del último envío exitoso
    TickType_t wakeTime    = xTaskGetTickCount();

    for (;;) {
        // --- Evaluamos condiciones de envío ---
        if (checkConditions(firstPktTs, lastSendTs)) {
            Serial.println(F("[AM_CTRL] Condiciones cumplidas. Iniciando ciclo de uplink..."));

            // 1. Encendemos el módulo. La librería pasará a WAITING_READY.
            am036.powerOn();
            
            const TickType_t cycleStart = xTaskGetTickCount();
            bool cycleOk = false;

            // 2. Esperamos READY (la librería nos notificará vía TaskNotify)
            uint32_t notif = 0;
            TickType_t remaining = pdMS_TO_TICKS(CYCLE_TIMEOUT_MS);

            while (!cycleOk) {
                // Calculamos el tiempo restante del ciclo
                TickType_t elapsed = xTaskGetTickCount() - cycleStart;
                if (elapsed >= pdMS_TO_TICKS(CYCLE_TIMEOUT_MS)) {
                    Serial.println(F("[AM_CTRL] Timeout global del ciclo de uplink."));
                    break;
                }
                remaining = pdMS_TO_TICKS(CYCLE_TIMEOUT_MS) - elapsed;

                // Damos pulsos de update() al driver mientras esperamos notificación.
                // xTaskNotifyWait con timeout corto (100 ms) → pseudo-interrupción:
                //   - Si hay notificación pendiente, regresa inmediatamente.
                //   - Si no, bloquea 100 ms y volvemos a llamar update() para watchdog.
                BaseType_t got = xTaskNotifyWait(
                    0,               // No limpiar bits al entrar
                    0xFFFFFFFF,      // Limpiar todos los bits al salir
                    &notif,
                    pdMS_TO_TICKS(100) < remaining ? pdMS_TO_TICKS(100) : remaining
                );

                // Alimentamos el watchdog de timeouts interno de la librería
                am036.update();

                if (got != pdTRUE) continue; // Sin notificación, seguimos esperando

                // --- Procesamos la notificación ---
                if (notif & AM_NOTIFY_ERROR) {
                    Serial.println(F("[AM_CTRL] Error de red. Abortando ciclo."));
                    break;
                }

                if (notif & AM_NOTIFY_READY) {
                    // Módulo listo → construimos y enviamos el BigPacket
                    Serial.println(F("[AM_CTRL] AM-036 READY. Enviando BigPacket..."));
                    String payload = buildFakeBigPacket();
                    if (!am036.sendBigPacket(payload)) {
                        Serial.println(F("[AM_CTRL] sendBigPacket() rechazado."));
                        break;
                    }
                    // Continuamos el bucle esperando SEND_OK o SEND_FAIL
                }

                if (notif & AM_NOTIFY_SEND_OK) {
                    AMSendResult result = am036.getLastResult();
                    Serial.printf("[AM_CTRL] Envío OK (HTTP %d).\n", result.httpCode);
                    //parseBigPacketResponse(result.responseBody);
                    lastSendTs = xTaskGetTickCount();
                    firstPktTs = 0; // Reseteamos el timestamp de la cola
                    cycleOk = true;
                }

                if (notif & AM_NOTIFY_SEND_FAIL) {
                    AMSendResult result = am036.getLastResult();
                    Serial.printf("[AM_CTRL] Envío FALLIDO (HTTP %d).\n", result.httpCode);
                    break;
                }
            }

            // 3. Apagamos el módulo siempre al final del ciclo
            am036.powerOff();
            Serial.println(cycleOk
                ? F("[AM_CTRL] Ciclo completado con éxito.")
                : F("[AM_CTRL] Ciclo finalizado con error."));
        }

        // 4. Esperamos exactamente TEN_MINUTES_MS desde el inicio de esta iteración
        vTaskDelayUntil(&wakeTime, pdMS_TO_TICKS(TEN_MINUTES_MS));
    }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
void AMSetup() {
    // Configuramos los pines del AM-036 sin encenderlo todavía
    pinMode(AM_MOSFET_PIN, OUTPUT);
    digitalWrite(AM_MOSFET_PIN, LOW);

    // Dejamos los pines UART como entradas pasivas hasta el primer powerOn()
    pinMode(AM_TX_PIN, INPUT);
    pinMode(AM_RX_PIN, INPUT);

    // Inicializamos el driver (configura UART y reserva buffer)
    am036.begin(115200, AM_RX_PIN, AM_TX_PIN);

    Serial.println(F("[AM_CTRL] Setup completado."));
}

void startUplinkTask() {
    TaskHandle_t taskHandle = nullptr;

    xTaskCreatePinnedToCore(
        uplink_manager_task,   // Función
        "UplinkManager",       // Nombre debug
        4096,                  // Stack (words)
        nullptr,               // Sin parámetros
        2,                     // Prioridad (mayor que display, menor que lora)
        &taskHandle,           // Handle → lo registramos en el driver
        0                      // Core 0 (mismo que FreeRTOS WiFi/BT, libre para nosotros)
    );

    // Registramos el handle en la librería para que pueda notificarla
    am036.setControlTask(taskHandle);

    Serial.println(F("[AM_CTRL] Tarea UplinkManager creada."));
}