#include "display.h"
// AMcontrol.cpp
// Implementación de la tarea de control del AM-036 con arquitectura de Job
// Processor.
//
// Arquitectura:
//   - am_manager_task espera bloqueada en xTaskNotifyWait()
//   - Se auto-despierta periódicamente para evaluar si debe enviar un
//   BIG_PACKET.
//   - Puede ser despertada instantáneamente (AM_NOTIFY_NEW_JOB) si hay un
//   trabajo urgente.
//   - Al despertar, si hay trabajos en cola (o toca big packet), enciende el
//   AM,
//     procesa TODOS los trabajos pendientes uno a uno, y luego se apaga.
//   - La tarea accessCheckResponseTask procesa asíncronamente las respuestas de
//   ACCESS_CHECK.

#include "AMcontrol.h"
#include "config.h"
#include "network.h" // shared_queueSize, MAX_CLIENTS, motasDataQueue, etc.
#include <ArduinoJson.h>

// ---------------------------------------------------------------------------
// Definición de la instancia única del driver
// ---------------------------------------------------------------------------
SerialAM am036(Serial1, AM_MOSFET_PIN);

// Cola de trabajos (entrada para am_manager_task)
QueueHandle_t amJobQueue;

// Cola de resultados (salida hacia lora_router)
QueueHandle_t amResultQueue;

// ---------------------------------------------------------------------------
// Constantes de tiempo
// ---------------------------------------------------------------------------
static constexpr uint32_t TEN_MINUTES_MS = 600000UL;
static constexpr uint32_t TWELVE_HOURS_MS = 43200000UL;
static constexpr uint32_t ONE_HOUR_MS = 3600000UL;

// Timeout máximo esperando READY o SEND_DONE para un *único* job
static constexpr uint32_t JOB_TIMEOUT_MS = 120000UL;

// Estructura interna para encolar trabajos
struct InternalAMJob {
  AMJobType type;
  size_t nodeId; // Usado para ACCESS_CHECK
};

// ---------------------------------------------------------------------------
// Construcción del BigPacket
//
// Formato JSON compacto para ahorrar flujo en transmisión por datos móviles:
//
// rt (router telemetry):
//   b  = batería (placeholder fijo 100% hasta integrar sensor)
//   lt = latitud
//   lg = longitud
//   tx = paquetes transmitidos
//   rx = paquetes recibidos
//   eT = errores TX
//   eR = errores RX
//   eC = errores criptográficos
//   qF = desbordamientos de cola
//   cB = errores canal ocupado
//   cv = cobertura GPRS (CSQ)
//   v  = versión configuración router
//
// ms (motas / sensores) — array:
//   id = ID de la mota
//   lt = latitud
//   lg = longitud
//   b  = batería (%)
//   h  = humedad (%)
//   rs = RSSI último paquete
//   sn = SNR último paquete (se calcula como ratio TX/RX simplificado)
//   eR = errores RX de la mota
//   v  = versión configuración mota
// ---------------------------------------------------------------------------
static String buildBigPacket() {
  // --- 1. Copiar datos compartidos bajo mutex (sección crítica breve) ---
  size_t local_tx = 0, local_rx = 0;
  size_t local_tx_err = 0, local_rx_err = 0;
  size_t local_queueFull = 0, local_crypto_err = 0, local_crc_err = 0;
  uint16_t local_channelBusy = 0;
  uint16_t local_version = 0;
  int8_t local_coverage = 0;
  std::vector<SensorsData> localMotas;

  if (xSemaphoreTake(statsMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    local_tx = shared_tx;
    local_rx = shared_rx;
    local_tx_err = shared_tx_err;
    local_rx_err = shared_rx_err;
    local_queueFull = shared_queueFull;
    local_channelBusy = shared_channelBusyErrors;
    local_crypto_err = shared_crypto_err;
    local_crc_err = shared_crc_err;
    local_version = version;
    local_coverage = shared_coverage;
    // Copia del vector de motas (deep copy) para serializar fuera del mutex
    localMotas = motasDataQueue;
    xSemaphoreGive(statsMutex);
  } else {
    Serial.println(
        F("[AM_CTRL] No se pudo tomar statsMutex para buildBigPacket."));
    return "{}";
  }

  // --- 2. Construir JSON sobre las copias locales (sin mutex) ---
  JsonDocument doc;

  // Router telemetry
  JsonObject rt = doc["rt"].to<JsonObject>();
  rt["b"] =
      100; // Batería router (placeholder hasta integrar sensor fuel gauge)
  rt["lt"] = ROUTER_LATITUDE;
  rt["lg"] = ROUTER_LONGITUDE;
  rt["tx"] = (unsigned long)local_tx;
  rt["rx"] = (unsigned long)local_rx;
  rt["eT"] = (unsigned long)local_tx_err;
  rt["eR"] = (unsigned long)local_rx_err;
  rt["eCry"] = (unsigned long)local_crypto_err;
  rt["eCrc"] = (unsigned long)local_crc_err;
  rt["qF"] = (unsigned long)local_queueFull;
  rt["cB"] = local_channelBusy;
  rt["cv"] = local_coverage;
  rt["v"] = local_version;

  // Motas array
  JsonArray ms = doc["ms"].to<JsonArray>();
  for (size_t i = 0; i < localMotas.size(); i++) {
    JsonObject m = ms.add<JsonObject>();
    m["id"] = (unsigned long)localMotas[i].id;
    m["lt"] = localMotas[i].latitude;
    m["lg"] = localMotas[i].longitude;
    m["b"] = localMotas[i].battery;
    m["h"] = localMotas[i].humidity;
    m["rs"] = localMotas[i].lastRssi;
    m["sn"] = localMotas[i].lastSnr;
    m["tx"] = localMotas[i].sendedPackets;
    m["rx"] = localMotas[i].receivedPackets;
    m["eR"] = localMotas[i].rx_err;
    m["eT"] = localMotas[i].tx_err;
    m["cB"] = localMotas[i].channelBusyErrors;
    m["eCry"] = localMotas[i].crypto_err;
    m["mA"] = localMotas[i].missingAckErrors;
    m["eCrc"] = localMotas[i].crc_err;
    m["v"] = localMotas[i].version;
  }

  String out;
  serializeJson(doc, out);
  return out;
}

// ---------------------------------------------------------------------------
// Condiciones de envío del BigPacket
// ---------------------------------------------------------------------------
static bool checkBigPacketConditions(TickType_t lastSendTs) {
  // Leemos shared_firstPktTimestamp y shared_queueSize bajo mutex
  TickType_t firstPktTs = 0;
  uint8_t queueSz = 0;

  if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
    firstPktTs = shared_firstPktTimestamp;
    queueSz = shared_queueSize;
    xSemaphoreGive(statsMutex);
  }

  // Condición 1: ≥ 1 hora desde que llegó el primer paquete pendiente
  bool oldPacket = (firstPktTs > 0) && ((xTaskGetTickCount() - firstPktTs) >=
                                        pdMS_TO_TICKS(ONE_HOUR_MS));

  // Condición 2: cola llena (máximo de clientes alcanzado)
  bool queueFull = (queueSz >= MAX_CLIENTS);

  // Condición 3: no se envió nada en las últimas 12 horas (telemetría router)
  bool heartbeat = (lastSendTs == 0) || ((xTaskGetTickCount() - lastSendTs) >=
                                         pdMS_TO_TICKS(TWELVE_HOURS_MS));

  return oldPacket || queueFull || heartbeat;
}

// ---------------------------------------------------------------------------
// Tarea procesadora de trabajos (reemplaza a uplink_manager_task)
// ---------------------------------------------------------------------------
TaskHandle_t amManagerTaskHandle = nullptr;

static void am_manager_task(void *pvParameters) {
  (void)pvParameters;

  TickType_t lastBigPacketSendTs =
      0; // timestamp del último envío exitoso de BP

  for (;;) {
    bool hasJobs = (uxQueueMessagesWaiting(amJobQueue) > 0);
    bool timeForBigPacket = checkBigPacketConditions(lastBigPacketSendTs);

    if (!hasJobs && !timeForBigPacket) {
      // Nada que hacer: bloqueamos hasta 10 mins o hasta que nos despierten
      // (AM_NOTIFY_NEW_JOB)
      uint32_t notif = 0;
      xTaskNotifyWait(0, 0xFFFFFFFF, &notif, pdMS_TO_TICKS(TEN_MINUTES_MS));
      continue;
    }

    Serial.println(
        F("[AM_CTRL] Despertando. Tareas pendientes o tiempo cumplido."));

    // 1. Encendemos el módulo
    am036.powerOn();

    // 2. Esperamos READY (con timeout de JOB_TIMEOUT_MS)
    bool moduleReady = false;
    uint32_t notif = 0;
    TickType_t waitStart = xTaskGetTickCount();

    while (!moduleReady) {
      if (xTaskGetTickCount() - waitStart >= pdMS_TO_TICKS(JOB_TIMEOUT_MS)) {
        Serial.println(F("[AM_CTRL] Timeout esperando READY del AM-036."));
        break;
      }

      BaseType_t got =
          xTaskNotifyWait(0, 0xFFFFFFFF, &notif, pdMS_TO_TICKS(100));
      am036.update();

      if (got == pdTRUE) {
        if (notif & AM_NOTIFY_ERROR) {
          Serial.println(F("[AM_CTRL] Error de red reportado por módulo."));
          break;
        }
        if (notif & AM_NOTIFY_READY) {
          if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
            shared_coverage = am036.getLastCsq();
            xSemaphoreGive(statsMutex);
          }
          moduleReady = true;
          Serial.println(F("[AM_CTRL] AM-036 READY."));
        }
      }
    }

    if (!moduleReady) {
      am036.powerOff();

      // Si no pudo encender, debemos vaciar la cola de jobs y marcarlos como
      // FALLIDOS (fail-safe) para no dejar colgado al sistema.
      InternalAMJob job;
      while (xQueueReceive(amJobQueue, &job, 0) == pdTRUE) {
        if (job.type == AMJobType::ACCESS_CHECK) {
          AMJobResult result = {AMJobType::ACCESS_CHECK, false, 0, "",
                                job.nodeId};
          xQueueSend(amResultQueue, &result, 0);
        }
      }

      continue; // Volvemos a esperar (con retardo natural del loop)
    }

    // 3. Procesamos BIG_PACKET si toca
    if (timeForBigPacket) {
      Serial.println(F("[AM_CTRL] Ejecutando Job: BIG_PACKET"));
      String payload = buildBigPacket();
      if (am036.sendBigPacket(payload)) {

        // Esperamos resultado
        bool jobDone = false;
        waitStart = xTaskGetTickCount();
        while (!jobDone) {
          if (xTaskGetTickCount() - waitStart >= pdMS_TO_TICKS(JOB_TIMEOUT_MS))
            break;

          BaseType_t got =
              xTaskNotifyWait(0, 0xFFFFFFFF, &notif, pdMS_TO_TICKS(100));
          am036.update();

          if (got == pdTRUE) {
            if (notif & AM_NOTIFY_SEND_OK) {
              AMSendResult res = am036.getLastResult();
              Serial.printf("[AM_CTRL] BIG_PACKET OK (HTTP %d).\n",
                            res.httpCode);
              parseBigPacketResponse(res.responseBody);

              if (xSemaphoreTake(statsMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
                motasDataQueue.clear();
                shared_queueSize = 0;
                shared_firstPktTimestamp = 0;
                xSemaphoreGive(statsMutex);
              }
              lastBigPacketSendTs = xTaskGetTickCount();
              jobDone = true;
            } else if (notif & AM_NOTIFY_SEND_FAIL) {
              AMSendResult res = am036.getLastResult();
              Serial.printf("[AM_CTRL] BIG_PACKET FALLÓ (HTTP %d).\n",
                            res.httpCode);
              jobDone = true; // Terminamos el intento
            } else if (notif & AM_NOTIFY_ERROR) {
              Serial.println(
                  F("[AM_CTRL] Error de red crítico durante BIG_PACKET."));
              break; // Rompemos el while interno
            }
          }
        }
      }
    }

    // 4. Procesamos todos los jobs pendientes en la cola (por ahora solo
    // ACCESS_CHECK)
    InternalAMJob currentJob;
    while (xQueueReceive(amJobQueue, &currentJob, 0) == pdTRUE) {
      if (currentJob.type == AMJobType::ACCESS_CHECK) {
        Serial.printf("[AM_CTRL] Ejecutando Job: ACCESS_CHECK para nodo %zu\n",
                      currentJob.nodeId);

        String path = "/routers/permitirAcceso/";
        path += String(currentJob.nodeId);

        if (am036.sendGetRequest(path)) {
          bool jobDone = false;
          waitStart = xTaskGetTickCount();

          AMJobResult res = {AMJobType::ACCESS_CHECK, false, 0, "",
                             currentJob.nodeId};

          while (!jobDone) {
            if (xTaskGetTickCount() - waitStart >=
                pdMS_TO_TICKS(JOB_TIMEOUT_MS))
              break;

            BaseType_t got =
                xTaskNotifyWait(0, 0xFFFFFFFF, &notif, pdMS_TO_TICKS(100));
            am036.update();

            if (got == pdTRUE) {
              if (notif & AM_NOTIFY_SEND_OK) {
                AMSendResult r = am036.getLastResult();
                Serial.printf("[AM_CTRL] ACCESS_CHECK OK (HTTP %d).\n",
                              r.httpCode);
                res.success = true;
                res.httpCode = r.httpCode;
                res.responseBody = r.responseBody;
                jobDone = true;
              } else if (notif & AM_NOTIFY_SEND_FAIL) {
                AMSendResult r = am036.getLastResult();
                Serial.printf("[AM_CTRL] ACCESS_CHECK FALLÓ (HTTP %d).\n",
                              r.httpCode);
                res.success = false;
                res.httpCode = r.httpCode;
                res.responseBody = r.responseBody;
                jobDone = true;
              } else if (notif & AM_NOTIFY_ERROR) {
                Serial.println(
                    F("[AM_CTRL] Error crítico durante ACCESS_CHECK."));
                res.success = false;
                break;
              }
            }
          }

          // Enviamos resultado a la cola de salida para lora_router
          xQueueSend(amResultQueue, &res, 0);
        }
      }
    }

    // 5. Apagamos el módulo siempre al final del ciclo
    am036.powerOff();
    Serial.println(F("[AM_CTRL] Ciclo de jobs completado. Módulo apagado."));
  }
}

// ---------------------------------------------------------------------------
// Encolar trabajos de verificación
// ---------------------------------------------------------------------------
bool enqueueAccessCheck(size_t nodeId) {
  if (amJobQueue == nullptr)
    return false;

  InternalAMJob job;
  job.type = AMJobType::ACCESS_CHECK;
  job.nodeId = nodeId;

  if (xQueueSend(amJobQueue, &job, pdMS_TO_TICKS(10)) == pdTRUE) {
    // Si lo encolamos bien, despertamos a la tarea inmediatamente
    if (amManagerTaskHandle != nullptr) {
      xTaskNotify(amManagerTaskHandle, AM_NOTIFY_NEW_JOB, eSetBits);
    }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Tarea para procesar asíncronamente las respuestas del AM
// ---------------------------------------------------------------------------
static void accessCheckResponseTask(void *pvParameters) {
  (void)pvParameters;
  AMJobResult result;

  for (;;) {
    // Bloqueamos hasta que haya una respuesta del AM
    if (xQueueReceive(amResultQueue, &result, portMAX_DELAY) == pdTRUE) {
      if (result.type == AMJobType::ACCESS_CHECK) {
        Serial.printf("[ACCESS_TASK] Respuesta recibida para nodo %zu: "
                      "success=%d HTTP=%d body='%s'\n",
                      result.nodeId, result.success, result.httpCode,
                      result.responseBody.c_str());

        bool accessGranted = false;

        if (result.success && result.httpCode == 200) {
          // El backend devuelve un string "true" o "false"
          if (result.responseBody == "true") {
            accessGranted = true;
          }
        }

        if (accessGranted) {
          Serial.printf("[ACCESS_TASK] Backend acepta al nodo %zu.\n",
                        result.nodeId);

          if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
            if (shared_connectedClients < MAX_CLIENTS) {
              shared_connectedClients++;
            }
            xSemaphoreGive(statsMutex);
          }
          addClient(result.nodeId);
          sendControlPacket(messageType::JOIN_ACCEPTED, result.nodeId);
        } else {
          Serial.printf(
              "[ACCESS_TASK] Backend deniega al nodo %zu (o falló red).\n",
              result.nodeId);
          sendControlPacket(messageType::JOIN_DENIED, result.nodeId);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
void AMSetup() {
  pinMode(AM_MOSFET_PIN, OUTPUT);
  digitalWrite(AM_MOSFET_PIN, LOW);

  pinMode(AM_TX_PIN, INPUT);
  pinMode(AM_RX_PIN, INPUT);

  am036.begin(115200, AM_RX_PIN, AM_TX_PIN);

  // Crear colas
  amJobQueue = xQueueCreate(10, sizeof(InternalAMJob));
  amResultQueue = xQueueCreate(10, sizeof(AMJobResult));

  Serial.println(F("[AM_CTRL] Setup completado. Colas creadas."));
}

void startUplinkTask() {
  xTaskCreatePinnedToCore(
      am_manager_task,      // Función
      "AmManager",          // Nombre debug
      4096,                 // Stack (words)
      nullptr,              // Sin parámetros
      2,                    // Prioridad
      &amManagerTaskHandle, // Handle → lo registramos en el driver
      0                     // Core 0
  );

  am036.setControlTask(amManagerTaskHandle);
  Serial.println(F("[AM_CTRL] Tarea AmManager creada."));

  // Tarea que procesa las respuestas
  xTaskCreatePinnedToCore(accessCheckResponseTask, "AccessResp", 2048, nullptr,
                          2, nullptr, 0);
  Serial.println(F("[AM_CTRL] Tarea AccessResp creada."));
}