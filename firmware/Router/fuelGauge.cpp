// fuelGauge.cpp — Implementación del driver MAX17043 para el router.
//
// Arquitectura FreeRTOS:
//   · fuelGaugeSetup() inicializa FuelWire (bus I2C 1) y el chip en setup().
//   · fuelGaugeTask() corre en Core 0, prioridad baja, lee cada 30 s.
//
// FuelWire usa el I2C bus 1 del ESP32 (pines SDA=34, SCL=33),
// independiente del bus 0 que puede usar el OLED.

#include "fuelGauge.h"
#include "display.h"   // statsMutex, shared_battery
#include <Wire.h>
#include <SparkFun_MAX1704x_Fuel_Gauge_Arduino_Library.h>

// I2C secundario (bus 1) — no interfiere con el OLED
static TwoWire    FuelWire(1);
static SFE_MAX1704X lipo;

static constexpr uint32_t READ_INTERVAL_MS = 30000UL; // 30 s entre lecturas

bool fuelGaugeSetup() {
    FuelWire.begin(FUEL_SDA_PIN, FUEL_SCL_PIN);

    // La API de SparkFun MAX1704x v1.0.4 acepta una referencia TwoWire
    if (!lipo.begin(FuelWire)) {
        Serial.println(F("[FUEL] ERROR: MAX17043 no detectado. Verifica I2C (SDA=34, SCL=33)."));
        return false;
    }

    lipo.quickStart();
    Serial.println(F("[FUEL] MAX17043 iniciado correctamente."));
    return true;
}

void fuelGaugeTask(void *pvParameters) {
    (void)pvParameters;

    for (;;) {
        float voltage    = lipo.getVoltage();
        float percentage = lipo.getSOC();

        BatteryStatus reading = {voltage, percentage, true};

        if (xSemaphoreTake(statsMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
            shared_battery = reading;
            xSemaphoreGive(statsMutex);
        }

        Serial.printf("[FUEL] Bat: %.1f%% | %.3fV \n",
                      percentage, voltage);

        vTaskDelay(pdMS_TO_TICKS(READ_INTERVAL_MS));
    }
}
