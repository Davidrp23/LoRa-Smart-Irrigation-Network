// gps.cpp — Implementación del driver GPS del router.
// Código idéntico al de maquinaEstadosMota/sensors.cpp:
//   · Mismos pines (MOSFET=48, RX=6, TX=7), mismo UART (Serial2).
//   · Al apagar: Serial2.end() + pinMode INPUT → sin alimentación parásita.

#include "gps.h"

static HardwareSerial GPS_Serial(2);   // UART2 del ESP32
static TinyGPSPlus    gps;

void routerGpsInit() {
    // MOSFET apagado al arrancar
    pinMode(GPS_MOSFET_PIN, OUTPUT);
    digitalWrite(GPS_MOSFET_PIN, LOW);

    // Pines en alta impedancia: sin corriente parásita hacia el módulo
    pinMode(GPS_TX_PIN, INPUT);
    pinMode(GPS_RX_PIN, INPUT);
}

bool routerGetGpsCoordinates(GpsData &data, uint32_t timeoutMs) {
    bool fixAcquired = false;
    data = {0.0, 0.0, 0.0, 0, false};

    Serial.println(F("[GPS_R] Encendiendo GPS y buscando satélites..."));

    // Reactivar UART y encender módulo
    GPS_Serial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    digitalWrite(GPS_MOSFET_PIN, HIGH);

    // Pequeño retardo para estabilizar el voltaje del módulo
    delay(500);

    // Limpiar basura residual en el buffer serial
    while (GPS_Serial.available() > 0) {
        GPS_Serial.read();
    }

    uint32_t startTime = millis();

    while ((millis() - startTime) < timeoutMs) {
        while (GPS_Serial.available() > 0) {
            gps.encode(GPS_Serial.read());
        }

        if (gps.location.isValid() &&
            gps.location.age() < 2000 &&
            gps.satellites.isValid() &&
            gps.satellites.value() > 0) {

            data.latitude   = gps.location.lat();
            data.longitude  = gps.location.lng();
            data.altitude   = gps.altitude.meters();
            data.satellites = gps.satellites.value();
            data.isValid    = true;
            fixAcquired     = true;
            break;
        }
        delay(10);
    }

    // Apagar GPS: bajar MOSFET, terminar UART y pines a INPUT
    digitalWrite(GPS_MOSFET_PIN, LOW);
    GPS_Serial.end();
    pinMode(GPS_TX_PIN, INPUT);
    pinMode(GPS_RX_PIN, INPUT);

    Serial.println(fixAcquired
        ? F("[GPS_R] Fix obtenido. GPS apagado.")
        : F("[GPS_R] Timeout: sin fix. GPS apagado."));

    return fixAcquired;
}
