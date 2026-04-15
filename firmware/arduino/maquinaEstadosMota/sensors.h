#include <cstdint>
//Sensors.h

//=============================
//            GPS
//=============================
#include <HardwareSerial.h>
#include "HT_TinyGPS++.h"

#define GPS_MOSFET_PIN 48
#define GPS_RX_PIN 6 
#define GPS_TX_PIN 7 
#define GPS_BAUD   9600 
#define GPS_TIMEOUT 120000

struct GpsData {
    double latitude;
    double longitude;
    double altitude;
    uint32_t satellites;
    bool isValid;
};

bool gpsInit();
bool getGpsCoordinates(GpsData &data, uint32_t timeoutMs);

//=============================
//           HUMEDAD
//=============================
#define HUM_MOSFET_PIN 47
#define HUM_READ_PIN 5
#define HUM_READ_ITERATIONS 20

// Valores de Calibración del Sensor de Humedad
#define SENSOR_SECO 4095 // Valor de lectura al aire o en tierra muy seca (0%)
#define SENSOR_AGUA 1950 // Valor sumergido en agua (100%)

struct humData {
    uint8_t percentage;
    size_t rawValue;
    bool isValid;
};

bool humInit();
void readHum(humData &data);