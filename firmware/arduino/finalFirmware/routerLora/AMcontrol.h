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
#define AM_MOSFET_PIN  3   // Gate del IRLML6344

// ---------------------------------------------------------------------------
// Instancia única del driver (definida en AMcontrol.cpp)
// ---------------------------------------------------------------------------
extern SerialAM am036;

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

// Configura pines y el driver UART. Llamar desde setup() antes de las tareas.
void AMSetup();

// Crea la tarea FreeRTOS uplink_manager. Llamar desde setup() tras AMSetup().
void startUplinkTask();
