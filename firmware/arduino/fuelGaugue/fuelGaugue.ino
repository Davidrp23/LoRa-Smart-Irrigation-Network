#include <Wire.h>
#include <SparkFun_MAX1704x_Fuel_Gauge_Arduino_Library.h>

// Pines I2C Nativos y estables para el ESP32 WROOM-32 clásico
#define SDA_PIN 21
#define SCL_PIN 22

// Creamos la instancia genérica del sensor
SFE_MAX1704X lipo; 

// --- VARIABLES GLOBALES PARA ALMACENAR LOS DATOS ---
String router_id = "router_principal_01";
float bat_v = 0.0;
float bat_pct = 0.0;
bool is_charging = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== Iniciando Nodo Master (Pruebas WROOM-32) ===");

  // 1. Iniciamos el bus I2C
  Wire.begin(SDA_PIN, SCL_PIN);

  // 2. Iniciamos la comunicación con el chip MAX17043
  if (!lipo.begin()) {
    Serial.println("[ERROR] No se detecta el MAX17043. Revisa el cableado I2C.");
    while (1); // Si no hay comunicación, detenemos por seguridad
  }

  // 3. Forzamos un reinicio rápido del algoritmo del chip
  lipo.quickStart();
  Serial.println("[OK] Fuel Gauge MAX17043 iniciado correctamente.");
}

void loop() {
  // --- LECTURA DEL HARDWARE Y ASIGNACIÓN A VARIABLES ---
  
  // Voltaje real en voltios
  bat_v = lipo.getVoltage(); 
  
  // Porcentaje de batería real calculado por el algoritmo
  bat_pct = lipo.getSOC();  
  
  // Lógica simple para determinar el estado de carga
  if (bat_v > 4.15) {
    is_charging = true;
  } else {
    is_charging = false;
  }

  // --- SALIDA DE DATOS POR MONITOR SERIE ---
  
  Serial.println("\n[INFO] Estado de la batería actualizado:");
  
  // Imprimimos las variables directamente
  Serial.print("ID Dispositivo: ");
  Serial.println(router_id);
  
  Serial.print("Voltaje: ");
  Serial.print(bat_v, 3); // Imprime con 3 decimales
  Serial.println(" V");
  
  Serial.print("Porcentaje: ");
  Serial.print(bat_pct, 2); // Imprime con 2 decimales
  Serial.println(" %");
  
  Serial.print("Cargando: ");
  Serial.println(is_charging ? "SI" : "NO");

  // Esperamos 10 segundos para la próxima lectura
  delay(10000); 
}