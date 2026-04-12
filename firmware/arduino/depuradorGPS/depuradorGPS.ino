#include <HardwareSerial.h>
#include <TinyGPSPlus.h>

#define MOSFET_PIN 18
// =================================================================
//                      CONFIGURACIÓN GPS (NEO-6M)
// =================================================================
#define GPS_RX_PIN 16 
#define GPS_TX_PIN 17 
#define GPS_BAUD   9600 

// Usamos la UART2 para el GPS
HardwareSerial GPS_Serial(2); 

// Creamos el objeto TinyGPSPlus que se encargará de decodificar
TinyGPSPlus gps;

void setup() {
    // Control de energía del GPS mediante MOSFET
    pinMode(MOSFET_PIN, OUTPUT);
    delay(200);     
    digitalWrite(MOSFET_PIN, HIGH);  // Encendido constante por ahora

    // Inicia el Monitor Serial
    Serial.begin(115200);
    delay(1000);
    Serial.println(F("\n--- INICIANDO NODO GPS ---"));
    Serial.println(F("Esperando a fijar satélites... (Esto puede tardar unos minutos al aire libre)"));
    Serial.println(F("----------------------------------------\n"));

    // Inicia la comunicación con el módulo GPS
    GPS_Serial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
}

void loop() {
    // 1. Leemos los datos entrantes del GPS y se los pasamos a la librería
    while (GPS_Serial.available() > 0) {
        gps.encode(GPS_Serial.read());
    }
    
    // 2. Si la librería ha procesado una nueva ubicación válida, la mostramos
    if (gps.location.isUpdated()) {
        Serial.println(F("================================="));
        
        // Latitud y Longitud con 6 decimales de precisión
        Serial.print(F("Latitud:   ")); 
        Serial.println(gps.location.lat(), 6);
        Serial.print(F("Longitud:  ")); 
        Serial.println(gps.location.lng(), 6);
        
        // Datos adicionales muy útiles
        Serial.print(F("Altitud:   ")); 
        Serial.print(gps.altitude.meters()); Serial.println(F(" m"));
        
        Serial.print(F("Velocidad: ")); 
        Serial.print(gps.speed.kmph()); Serial.println(F(" km/h"));
        
        Serial.print(F("Satélites: ")); 
        Serial.println(gps.satellites.value());
        
        // Fecha y Hora (UTC)
        Serial.print(F("Fecha:     "));
        Serial.print(gps.date.day()); Serial.print(F("/"));
        Serial.print(gps.date.month()); Serial.print(F("/"));
        Serial.println(gps.date.year());
        
        Serial.println(F("=================================\n"));
    }

    // 3. Alerta por si hay problemas de conexión física (cables TX/RX cruzados o sueltos)
    if (millis() > 5000 && gps.charsProcessed() < 10) {
        Serial.println(F("No se detectan datos del GPS. Revisa el cableado y el MOSFET."));
        delay(2000); // Pausa para no inundar el monitor
    }
}