// gps.h — Driver GPS del router
// Mismo módulo hardware que las motas (Serial2, MOSFET=48, RX=6, TX=7).
// Patrón idéntico a maquinaEstadosMota/sensors.cpp:
//   · Pines en INPUT al inicio y al apagar → sin corriente parásita.
//   · Serial2.end() + pinMode INPUT tras cada lectura.

#pragma once
#include <Arduino.h>
#include "HT_TinyGPS++.h"
#include "types.h"   // GpsData
#include "config.h"  // GPS_MOSFET_PIN, GPS_RX_PIN, GPS_TX_PIN, etc.

// Inicializa MOSFET y pines en estado seguro (INPUT). Llamar desde setup().
void routerGpsInit();

// Enciende el GPS, espera fix con timeout y apaga. Thread-safe (bloqueante).
// Retorna true si obtuvo fix válido. Actualiza 'data' con las coordenadas.
bool routerGetGpsCoordinates(GpsData &data, uint32_t timeoutMs);
