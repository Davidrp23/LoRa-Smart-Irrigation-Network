// AM-036 (esp32 wrover-b + sim800l) (ANTS MAKE)

#define TINY_GSM_MODEM_SIM800
#define SerialMon Serial
#define SerialAT Serial1
#define TINY_GSM_DEBUG SerialMon // Descomenta para ver la depuración de TinyGSM si hay problemas
#define GSM_PIN ""

#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>

TinyGsm modem(SerialAT);
TinyGsmClient client(modem);

// Pines ESP32 y SIM800l
#define MODEM_RST 5
#define MODEM_PWKEY 4
#define MODEM_POWER_ON 23
#define MODEM_TX 27
#define MODEM_RX 26
#define I2C_SDA 21
#define I2C_SCL 22

// Datos del operador
const char apn[]  = "movistar.es";
const char gprsUser[] = "movistar";
const char gprsPass[] = "movistar";
const char* number = "+34684457438";

// Configuración del servidor
const char server[] = "httpbin.org";
const int  port   = 80;

// --- VARIABLES DE LA MÁQUINA DE ESTADOS ---
enum ModemState {
  STATE_HARD_RESET,
  STATE_INIT,
  STATE_WAIT_NETWORK,
  STATE_CONNECT_GPRS,
  STATE_CONNECTED,
  STATE_ERROR
};

ModemState estadoActual = STATE_HARD_RESET;
unsigned long ultimoIntento = 0;
int contadorErrores = 0;
const int MAX_ERRORES = 3; // Si falla 3 veces, hacemos Hard Reset

// --- TEMPORIZADORES NO BLOQUEANTES ---
unsigned long lastSignalCheck = 0;
unsigned long lastGetRequest = 0;

void setup() {
  SerialMon.begin(115200);
  delay(100);
  
  // Configuración de pines
  pinMode(MODEM_PWKEY, OUTPUT);
  pinMode(MODEM_RST, OUTPUT);
  pinMode(MODEM_POWER_ON, OUTPUT);

  // Encender la alimentación del módulo (si usas un MOSFET o similar en POWER_ON)
  digitalWrite(MODEM_POWER_ON, HIGH);
  
  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);
  
  SerialMon.println("=== Sistema Iniciado. Comenzando secuencia del Módem ===");
  // El setup termina rápido. El trabajo duro lo hace el loop()
}

void loop() {
  gestionarModem();

  // Si estamos conectados, ejecutamos nuestras tareas periódicas
  if (estadoActual == STATE_CONNECTED) {
    
    // Tarea 1: Imprimir la señal cada 10 segundos
    if (millis() - lastSignalCheck > 10000) {
      int signal = modem.getSignalQuality();
      SerialMon.print("[INFO] Calidad de señal (0-31): ");
      SerialMon.println(signal);
      lastSignalCheck = millis();
    }

    // Tarea 2: Hacer un GET HTTP cada 60 segundos (ejemplo)
    if (millis() - lastGetRequest > 60000) {
      hacerGet("/get");
      lastGetRequest = millis();
    }
  }
}

// ==========================================
// FUNCIONES DE CONTROL
// ==========================================

void gestionarModem() {
  // Solo ejecutamos cambios de estado cada cierto tiempo para no saturar el puerto serie
  // excepto si estamos conectados, que monitorizamos continuamente.
  if (estadoActual != STATE_CONNECTED && millis() - ultimoIntento < 5000) return;

  switch (estadoActual) {
    
    case STATE_HARD_RESET:
      SerialMon.println("\n[MÁQUINA DE ESTADOS] Realizando Hard Reset del SIM800L...");
      
      // Reinicio por hardware
      digitalWrite(MODEM_RST, LOW);
      delay(100);
      digitalWrite(MODEM_RST, HIGH);
      
      // Pulso de encendido
      digitalWrite(MODEM_PWKEY, LOW);
      delay(1200);
      digitalWrite(MODEM_PWKEY, HIGH);
      
      // Esperar a que el módulo arranque internamente
      delay(3000); 
      
      contadorErrores = 0;
      estadoActual = STATE_INIT;
      ultimoIntento = millis();
      break;

    case STATE_INIT:
      SerialMon.println("[MÁQUINA DE ESTADOS] Iniciando comunicación AT...");
      if (modem.restart()) { // reinicia por software y verifica comunicación
        SerialMon.println("[OK] Módem responde.");
        
        if (GSM_PIN && modem.getSimStatus() != 3) {
          modem.simUnlock(GSM_PIN);
        }
        estadoActual = STATE_WAIT_NETWORK;
      } else {
        registrarError("[ERROR] Módem no responde a comandos AT.");
      }
      ultimoIntento = millis();
      break;

    case STATE_WAIT_NETWORK:
      SerialMon.println("[MÁQUINA DE ESTADOS] Esperando red celular...");
      // Timeout corto (15 seg) para no bloquear el ESP32 eternamente
      if (modem.waitForNetwork(15000L)) { 
        SerialMon.println("[OK] Conectado a la red celular.");
        contadorErrores = 0; // Reseteamos errores al lograr éxito parcial
        estadoActual = STATE_CONNECT_GPRS;
      } else {
        registrarError("[ERROR] Fallo al buscar red.");
      }
      ultimoIntento = millis();
      break;

    case STATE_CONNECT_GPRS:
      SerialMon.println("[MÁQUINA DE ESTADOS] Conectando a GPRS (Internet)...");
      if (modem.gprsConnect(apn, gprsUser, gprsPass)) {
        SerialMon.println("[OK] GPRS Conectado con éxito.");
        
        IPAddress local = modem.localIP();
        SerialMon.print("[INFO] IP Local: ");
        SerialMon.println(local);
        
        contadorErrores = 0;
        estadoActual = STATE_CONNECTED;
      } else {
        registrarError("[ERROR] Fallo al levantar GPRS.");
      }
      ultimoIntento = millis();
      break;

    case STATE_CONNECTED:
      // Comprobación de salud de la conexión
      if (!modem.isNetworkConnected()) {
        SerialMon.println("[ALERTA] Red celular perdida.");
        estadoActual = STATE_WAIT_NETWORK;
        ultimoIntento = millis();
      } else if (!modem.isGprsConnected()) {
        SerialMon.println("[ALERTA] Conexión GPRS perdida.");
        estadoActual = STATE_CONNECT_GPRS;
        ultimoIntento = millis();
      }
      break;

    case STATE_ERROR:
      // Si llegamos aquí, forzamos un reinicio físico completo
      SerialMon.println("[FATAL] Demasiados errores consecutivos. Forzando recuperación.");
      estadoActual = STATE_HARD_RESET;
      ultimoIntento = millis();
      break;
  }
}

void registrarError(String mensaje) {
  SerialMon.println(mensaje);
  contadorErrores++;
  SerialMon.print("Intentos fallidos: ");
  SerialMon.print(contadorErrores);
  SerialMon.print("/");
  SerialMon.println(MAX_ERRORES);

  if (contadorErrores >= MAX_ERRORES) {
    estadoActual = STATE_ERROR;
  }
}

void hacerGet(String path) {
  SerialMon.println("\n--- Iniciando petición GET ---");
  HttpClient http(client, server, port);

  // Configuramos un timeout para la respuesta HTTP (ej: 10 segundos)
  http.setHttpResponseTimeout(10000); 

  int err = http.get(path);
  if (err != 0) {
    SerialMon.println("[HTTP ERROR] Fallo al conectar con el servidor.");
    return;
  }

  int status = http.responseStatusCode();
  SerialMon.print("[HTTP OK] Código de estado: ");
  SerialMon.println(status);

  if (status > 0) {
    String body = http.responseBody();
    SerialMon.println("Respuesta:");
    SerialMon.println(body);
  }
  
  http.stop(); // Importante: liberar el socket al terminar
  SerialMon.println("------------------------------\n");
}