#include "esp32-hal-gpio.h"
#include <cstdint>
#include <cstddef>
//Sensors.cpp

#include "Arduino.h"

//=============================
//            GPS
//=============================
#include "sensors.h"

HardwareSerial GPS_Serial(2); 
TinyGPSPlus gps;

bool gpsInit(){
  // Configuración de pines y puerto serie del GPS
  pinMode(GPS_MOSFET_PIN, OUTPUT);
  digitalWrite(GPS_MOSFET_PIN, HIGH); // Asegurar que el GPS inicie apagado (Logica invertida)
  // Evitamos inicializar el Serial aquí para no dejar los pines en estado ALTO
  pinMode(GPS_TX_PIN, INPUT);
  pinMode(GPS_RX_PIN, INPUT);
  return true;
}

//Enciende el GPS, intenta obtener una ubicación válida dentro de un límite de tiempo y lo apaga.
bool getGpsCoordinates(GpsData &data, uint32_t timeoutMs) {
    bool fixAcquired = false;
    data = {0}; // Eliminamos las coordenadas guardadas rellenando todo con 0's (isValid = False)
    
    //Encender GPS (Logica invertida)
    Serial.println("Encendiendo GPS y buscando satelites...");
    GPS_Serial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    digitalWrite(GPS_MOSFET_PIN, LOW);
    
    // Pequeño retardo para dar tiempo a que el voltaje del módulo se estabilice
    delay(500);
    
    // Limpiar cualquier dato basura residual en el buffer serial del GPS
    while (GPS_Serial.available() > 0) {
      GPS_Serial.read();
    }

    uint32_t startTime = millis();

    while ((millis() - startTime) < timeoutMs) { //Intentamos obtener la ubicacion con un timeout
        
        while (GPS_Serial.available() > 0) {
          gps.encode(GPS_Serial.read());
          //char gpsChar = GPS_Serial.read();
          //Serial.print(gpsChar);
        }

        if (gps.location.isValid() && gps.location.age() < 2000 && gps.satellites.isValid() && gps.satellites.value() > 0) {
            
          data.latitude   = gps.location.lat();
          data.longitude  = gps.location.lng();
          data.altitude   = gps.altitude.meters();
          data.satellites = gps.satellites.value();
          data.isValid    = true;
          
          fixAcquired = true;
          break;
        }

        delay(10); 
    }

    //Apagar GPS (Logica invertida)
    digitalWrite(GPS_MOSFET_PIN, HIGH);
    GPS_Serial.end();
    // Ponemos los pines en alta impedancia para evitar alimentar el GPS por el pin TX (alimentación parásita)
    pinMode(GPS_TX_PIN, INPUT);
    pinMode(GPS_RX_PIN, INPUT);
    Serial.println("Se apago el GPS para ahorrar bateria.");

    return fixAcquired;
}

//=============================
//           HUMEDAD
//=============================
bool humInit(){
  // Configuración de pines para leer la humeadad (Logica invertida)
  pinMode(HUM_MOSFET_PIN, OUTPUT);
  digitalWrite(HUM_MOSFET_PIN, HIGH); // Asegurar que el lector de humedad inicie apagado (Logica invertida)
  return true;
}

void readHum(humData &data){
  // Encender sensor (Logica invertida)
  digitalWrite(HUM_MOSFET_PIN, LOW);
  delay(100); 

  size_t rawValueAVG = 0;

  for(uint8_t i = 0 ; i < HUM_READ_ITERATIONS; i++){
    rawValueAVG += analogRead(HUM_READ_PIN);
    delay(10); 
  }

  // Apagar sensor inmediatamente (Logica invertida)
  digitalWrite(HUM_MOSFET_PIN, HIGH);

  rawValueAVG = rawValueAVG / HUM_READ_ITERATIONS;

  int8_t percentage = map(rawValueAVG, SENSOR_AGUA, SENSOR_SECO, 100, 0);
  
  // Limitar el rango
  if (percentage < 0) {
    percentage = 0;
  } else if (percentage > 100) {
    percentage = 100; 
  }

  data.percentage = percentage;
  data.rawValue = rawValueAVG;
  data.isValid = true;
}