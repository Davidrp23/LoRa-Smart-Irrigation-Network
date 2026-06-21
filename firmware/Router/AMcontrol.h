// AMcontrol.h
// Capa de control del AM-036.
// Expone únicamente las funciones públicas necesarias para el .ino:
//   - AMSetup()        → configuración inicial (llamar desde setup())
//   - startUplinkTask()→ registra y lanza la tarea FreeRTOS de uplink

#pragma once

#include <Arduino.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "SerialAM_lib.h"

// ---------------------------------------------------------------------------
// Pinout del AM-036
// ---------------------------------------------------------------------------
#define AM_RX_PIN     41   // RX Heltec ← TX AM-036
#define AM_TX_PIN     42   // TX Heltec → RX AM-036
#define AM_MOSFET_PIN  47   // Gate del IRLML6344

// ---------------------------------------------------------------------------
// Instancia única del driver (definida en AMcontrol.cpp)
// ---------------------------------------------------------------------------
extern SerialAM am036;

// ---------------------------------------------------------------------------
// Tipos de trabajo que puede procesar el AM-036
// ---------------------------------------------------------------------------
enum class AMJobType : uint8_t {
    BIG_PACKET,       // POST del big-packet (uplink periódico)
    ACCESS_CHECK      // GET /routers/permitirAcceso/{nodeId}
};

// ---------------------------------------------------------------------------
// Resultado de un trabajo completado
// ---------------------------------------------------------------------------
struct AMJobResult {
    AMJobType type;
    bool      success;
    int       httpCode;
    String    responseBody;
    size_t    nodeId;      // Solo relevante para ACCESS_CHECK
};

// ---------------------------------------------------------------------------
// Colas
// ---------------------------------------------------------------------------
// Cola para que el resultado de ACCESS_CHECK se devuelva a lora_router
extern QueueHandle_t amResultQueue;

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

// Configura pines y el driver UART. Llamar desde setup() antes de las tareas.
void AMSetup();

// Crea las tareas FreeRTOS del AM-036. Llamar desde setup() tras AMSetup().
void startUplinkTask();

// Encola un trabajo de verificación de acceso (no bloqueante)
bool enqueueAccessCheck(size_t nodeId);

// Dispara manualmente un big-packet desde el OLED (no bloqueante, ISR-safe)
void triggerManualBigPacket();
