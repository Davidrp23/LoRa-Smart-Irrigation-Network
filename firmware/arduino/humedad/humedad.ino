#include <TinyGPS++.h>
#include <HardwareSerial.h>

// =================================================================
//                      CONFIGURACIÓN GPS (NEO-6M)
// =================================================================
#define GPS_RX_PIN 16 // Conectar al TX del NEO-6M
#define GPS_TX_PIN 17 // Conectar al RX del NEO-6M
#define GPS_BAUD   9600 // Velocidad por defecto del módulo NEO-6M

HardwareSerial GPS_Serial(2); // Usamos la UART2
TinyGPSPlus gps;

// Variables de estado del GPS (VOLÁTILES - se reinician en cada arranque)
double latitud_inicial = 0.0;
double longitud_inicial = 0.0;
bool fix_obtenido = false; 

// Tiempo máximo de espera para la adquisición (3 minutos)
const unsigned long MAX_WAIT_TIME_MS = 180000; 

// =================================================================
//                   CONFIGURACIÓN SENSOR DE HUMEDAD
// =================================================================
// Pin donde está conectado el sensor de humedad (Ejemplo: GPIO 25)
const int ANALOG_PIN = 25; 
// Pin Digital (Ejemplo: GPIO 27)
const int DIGITAL_PIN = 27; 

// Valores de Calibración del Sensor de Humedad
// *** AJUSTA ESTOS VALORES ***
const int SENSOR_SECO = 4095; // Valor de lectura al aire o en tierra muy seca (0%)
const int SENSOR_AGUA = 1950; // Valor sumergido en agua (100%)


// =================================================================
//                            LOGICA PRINCIPAL
// =================================================================

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n--- INICIANDO SISTEMA ESP32 ---");

    // Configuración del sensor de humedad
    pinMode(DIGITAL_PIN, INPUT); 

    // 1. INICIAR ADQUISICIÓN GPS (Ocurre en CADA arranque)
    Serial.println("\n[GPS] Iniciando adquisicion de ubicacion...");
    GPS_Serial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

    unsigned long inicio_tiempo = millis();

    // 2. Bucle de adquisición con tiempo límite
    while (millis() - inicio_tiempo < MAX_WAIT_TIME_MS && !fix_obtenido) {
        // Procesar datos del GPS
        while (GPS_Serial.available() > 0) {
            if (gps.encode(GPS_Serial.read())) {
                if (gps.location.isValid() && gps.location.isUpdated()) {
                    latitud_inicial = gps.location.lat();
                    longitud_inicial = gps.location.lng();
                    fix_obtenido = true;
                    
                    Serial.println("******************************************");
                    Serial.println("*** ¡FIJO GPS OBTENIDO EN EL ARRANQUE! ***");
                    Serial.print("Latitud: "); Serial.println(latitud_inicial, 6);
                    Serial.print("Longitud: "); Serial.println(longitud_inicial, 6);
                    Serial.println("******************************************");
                    
                    break; 
                }
            }
        }
        delay(100); 
    }

    if (!fix_obtenido) {
        Serial.println("[GPS] Tiempo agotado. No se pudo obtener la ubicacion en este arranque.");
    }
    
    // 3. Cierre del puerto serial del GPS. 
    // Esto detiene la lectura del NEO-6M, cumpliendo la condicion de "ignorar despues".
    GPS_Serial.end();
    Serial.println("\n[GPS] UART deshabilitada. Comienza el LOOP principal.");
}

void loop() {
    // ----------------------------------------------------
    // LÓGICA PRINCIPAL: SENSOR DE HUMEDAD
    // ----------------------------------------------------
    
    // 1. Lectura y cálculo del porcentaje de humedad
    int rawValue = analogRead(ANALOG_PIN);
    long percentage = map(rawValue, SENSOR_AGUA, SENSOR_SECO, 100, 0);

    // Limitar el rango
    if (percentage < 0) {
      percentage = 0;
    } else if (percentage > 100) {
      percentage = 100; 
    }

    // 2. Imprime el estado del GPS (Ubicación VOLÁTIL)
    Serial.println("\n--- INFORME DE ESTADO ---");
    if (fix_obtenido) {
        Serial.println("[GPS] OK. Ultima ubicacion: ");
        Serial.print("Latitud: "); Serial.println(latitud_inicial, 6);
        Serial.print("Longitud: "); Serial.println(longitud_inicial, 6);
    } else {
        Serial.println("[GPS] Fallido en el arranque. Ubicacion no disponible.");
    }
    
    // 3. Imprime los resultados del sensor
    Serial.println("--- LECTURA DEL SENSOR DE HUMEDAD ---");
    Serial.print("Lectura Analogica (GPIO ");
    Serial.print(ANALOG_PIN);
    Serial.print("): ");
    Serial.println(rawValue);
    
    Serial.print("HUMEDAD ESTIMADA: ");
    Serial.print(percentage);
    Serial.println("%");
    
    // Esperar 5 segundos
    delay(5000);
}
