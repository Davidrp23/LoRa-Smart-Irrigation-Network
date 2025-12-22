#include <HardwareSerial.h>

// =================================================================
//                      CONFIGURACIÓN GPS (NEO-6M)
// =================================================================
// ¡IMPORTANTE! Revisa las conexiones:
// TX del NEO-6M debe ir al RX del ESP32 (Pin 16)
// RX del NEO-6M debe ir al TX del ESP32 (Pin 17)
#define GPS_RX_PIN 16 
#define GPS_TX_PIN 17 
#define GPS_BAUD   9600 // La velocidad por defecto del NEO-6M

// Usamos la UART2 para el GPS.
HardwareSerial GPS_Serial(2); 


void setup() {
    // Inicia el Monitor Serial a una velocidad ALTA para ver los datos
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n--- INICIANDO DEPURADOR DE DATOS GPS ---");
    Serial.println("Revisa el baud rate: 115200.");
    Serial.println("Si ves texto aqui, la comunicacion es correcta.");
    Serial.println("Esperando datos del GPS...");
    Serial.println("----------------------------------------\n");

    // Inicia la comunicación con el módulo GPS
    GPS_Serial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
}


void loop() {
    // 1. Lee los datos que vienen del módulo GPS (UART2)
    while (GPS_Serial.available() > 0) {
        // Leemos cada byte
        char gpsChar = GPS_Serial.read();
        
        // 2. Enviamos el byte directamente al Monitor Serial
        Serial.print(gpsChar);
    }
    
    // Pequeña pausa para no saturar el CPU
    delay(10); 
}
