// fuelGauge.h — Driver Fuel Gauge MAX17043 para el router.
// Usa Wire1 (I2C secundario) en pines SCL=33, SDA=34.
// Expone una tarea FreeRTOS que actualiza shared_battery periódicamente.

#pragma once
#include <Arduino.h>
#include "types.h"    // BatteryStatus
#include "config.h"   // FUEL_SDA_PIN, FUEL_SCL_PIN, FUEL_CHARGE_THRESHOLD_V

// Inicializa el bus Wire1 y el chip MAX17043. Llamar desde setup().
// Retorna true si el chip responde, false si hay error de cableado.
bool fuelGaugeSetup();

// Tarea FreeRTOS que lee el sensor cada 30 s y actualiza shared_battery
// bajo statsMutex. Arrancar con xTaskCreatePinnedToCore.
void fuelGaugeTask(void *pvParameters);
