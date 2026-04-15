#include <HardwareSerial.h>
#include <TinyGPSPlus.h>

// =================================================================
//                      DEFINICIONES DE HARDWARE
// =================================================================
#define GPS_MOSFET_PIN 18
#define GPS_RX_PIN 16 
#define GPS_TX_PIN 17 
#define GPS_BAUD   9600 

#define GPS_TIMEOUT 120000

HardwareSerial GPS_Serial(2); 
TinyGPSPlus gps;

// =================================================================
//                      ESTRUCTURAS DE DATOS
// =================================================================
/**
 * Estructura para almacenar de forma encapsulada los datos leídos del GPS.
 * Esto facilita el transporte de múltiples valores entre funciones.
 */
struct GpsData {
    double latitude;
    double longitude;
    double altitude;
    uint32_t satellites;
    bool isValid;
};

GpsData myGpsData = {0};

// =================================================================
//                      PROTOTIPOS DE FUNCIONES
// =================================================================
bool getGpsCoordinates(GpsData &data, uint32_t timeoutMs);

// =================================================================
//                      CONFIGURACIÓN INICIAL
// =================================================================
void setup() {

    Serial.begin(115200);
    delay(1000);
    
    // Configuración de pines y puerto serie del GPS
    pinMode(GPS_MOSFET_PIN, OUTPUT);
    digitalWrite(GPS_MOSFET_PIN, LOW); // Asegurar que el GPS inicie apagado
    GPS_Serial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

    
    // Llamamos a la función pasando la estructura por referencia
    if (getGpsCoordinates(myGpsData, GPS_TIMEOUT)) {
        // La función devolvió 'true', lo que significa que tenemos coordenadas válidas
        Serial.println(F("[ÉXITO] Coordenadas obtenidas correctamente:"));
        Serial.print(F(" -> Latitud:   ")); Serial.println(myGpsData.latitude, 6);
        Serial.print(F(" -> Longitud:  ")); Serial.println(myGpsData.longitude, 6);
        Serial.print(F(" -> Altitud:   ")); Serial.print(myGpsData.altitude); Serial.println(F(" m"));
        Serial.print(F(" -> Satélites: ")); Serial.println(myGpsData.satellites);
    } else {
        // La función devolvió 'false', se agotó el tiempo sin obtener señal
        Serial.println(F("[ERROR] Timeout: No se pudo fijar la ubicación GPS a tiempo."));
    }
}

// =================================================================
//                      BUCLE PRINCIPAL
// =================================================================
void loop() {
    // El ESP32 ahora puede dedicarse a otras tareas (como enviar por LoRa)
    // mientras el GPS permanece apagado y sin consumir batería.
    delay(10000); 
}

// =================================================================
//                      IMPLEMENTACIÓN DE FUNCIONES
// =================================================================

//Enciende el GPS, intenta obtener una ubicación válida dentro de un límite de tiempo y lo apaga.
bool getGpsCoordinates(GpsData &data, uint32_t timeoutMs) {
    bool fixAcquired = false;
    myGpsData = {0}; // Eliminamos las coordenadas guardadas rellenando todo con 0's (isValid = False)
    
    //Encender GPS
    Serial.println("Encendiendo GPS y buscando satelites...");
    digitalWrite(GPS_MOSFET_PIN, HIGH);
    
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
        }

        if (gps.location.isUpdated() && gps.location.isValid()) {
            
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

    //Apagar GPS
    digitalWrite(GPS_MOSFET_PIN, LOW);
    Serial.println("Se apago el GPS para ahorrar bateria.");

    return fixAcquired;
}