// AM-036 (esp32 wrover-b + sim800l) (ESCLAVO)

#define TINY_GSM_MODEM_SIM800
#define SerialMon Serial // Se usa para Debug y para hablar con el Heltec
#define SerialAT Serial1
#define GSM_PIN ""

#include <ArduinoHttpClient.h>
#include <ArduinoJson.h> // ¡Importante! Instalar ArduinoJson v7 desde el gestor de librerías
#include <TinyGsmClient.h>

TinyGsm modem(SerialAT);
TinyGsmClient client(modem);

// Pines ESP32 y SIM800l
#define MODEM_RST 5
#define MODEM_PWKEY 4
#define MODEM_POWER_ON 23
#define MODEM_TX 27
#define MODEM_RX 26

// Datos del operador
const char apn[] = "movistar.es";
const char gprsUser[] = "movistar";
const char gprsPass[] = "movistar";

// Pines LED RGB
#define PIN_RED 15
#define PIN_GREEN 0
#define PIN_BLUE 2

enum LEDMode {
  LED_OFF,
  LED_BOOT,       // Rojo Fijo
  LED_CONNECTING, // Azul Parpadeo
  LED_READY,      // Verde Fijo
  LED_TRAFFIC     // Amarillo Parpadeo
};

LEDMode currentLedMode = LED_BOOT;
SemaphoreHandle_t ledMutex = NULL;

void setLedMode(LEDMode mode) {
  if (ledMutex != NULL) {
    if (xSemaphoreTake(ledMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
      currentLedMode = mode;
      xSemaphoreGive(ledMutex);
    }
  } else {
    currentLedMode = mode;
  }
}

void ledTaskCode(void *pvParameters);

// Configuración del servidor
const char server[] = "flora.ddns.net";
const int port = 80;

// Rutas de la API
const char bigPacketPath[] = "/api/big-packet"; // POST telemetría

// Headers de autenticación del router
const char headerDeviceId[] = "x-device-id";
const char headerDeviceToken[] = "x-device-token";
const char deviceIdValue[] = "1";
const char deviceTokenValue[] = "eb1348f0abedcf9cc764c8b6f4107efa";

// Variables de la Máquina de Estados
enum ModemState {
  STATE_HARD_RESET,
  STATE_INIT,
  STATE_WAIT_NETWORK,
  STATE_CONNECT_GPRS,
  STATE_IDLE_LISTENING, // Estado principal: Esperando órdenes del Heltec
  STATE_ERROR
};

ModemState estadoActual = STATE_HARD_RESET;
unsigned long ultimoIntento = 0;
int contadorErrores = 0;
const int MAX_ERRORES = 3;

// Variables para la comunicación UART con Heltec
String rxBuffer = "";
bool ordenPendienteSend = false;
bool ordenPendienteGet = false;
String payloadParaEnviar = "";
String pathParaGet = "";

void setup() {
  // Inicializamos comunicación serial a 115200 (debe coincidir con la de tu
  // clase SerialAM)
  SerialMon.begin(115200);
  delay(100);

  pinMode(MODEM_PWKEY, OUTPUT);
  pinMode(MODEM_RST, OUTPUT);
  pinMode(MODEM_POWER_ON, OUTPUT);

  // Inicializar pines LED
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  setRGB(0, 0, 0); // Apagar al inicio

  ledMutex = xSemaphoreCreateMutex();
  if (ledMutex != NULL) {
    xTaskCreatePinnedToCore(ledTaskCode, /* Función de la tarea */
                            "LED_Task",  /* Nombre de la tarea */
                            2048,        /* Tamaño del stack */
                            NULL,        /* Parámetros */
                            1,           /* Prioridad (1 es baja/normal) */
                            NULL,        /* Handle de la tarea */
                            1            /* Núcleo 1 */
    );
  }

  digitalWrite(MODEM_POWER_ON, HIGH);

  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);

  rxBuffer.reserve(512); // Reservamos memoria para evitar fragmentación
}

void loop() {
  gestionarModem();

  // Solo escuchamos al Heltec si estamos conectados y listos
  if (estadoActual == STATE_IDLE_LISTENING) {
    escucharUART();

    // Si recibimos un comando "SEND" completo, lo procesamos
    if (ordenPendienteSend) {
      realizarPost(payloadParaEnviar);
      ordenPendienteSend = false;
      payloadParaEnviar = "";
    }

    // Si recibimos un comando "GET" completo, lo procesamos
    if (ordenPendienteGet) {
      realizarGet(pathParaGet);
      ordenPendienteGet = false;
      pathParaGet = "";
    }
  }
}

// ==========================================
// FUNCIONES DE CONTROL DEL MÓDEM
// ==========================================

void gestionarModem() {
  if (estadoActual != STATE_IDLE_LISTENING && millis() - ultimoIntento < 5000)
    return;

  switch (estadoActual) {
  case STATE_HARD_RESET:
    digitalWrite(MODEM_RST, LOW);
    delay(100);
    digitalWrite(MODEM_RST, HIGH);
    digitalWrite(MODEM_PWKEY, LOW);
    delay(1200);
    digitalWrite(MODEM_PWKEY, HIGH);
    delay(3000);
    contadorErrores = 0;
    estadoActual = STATE_INIT;
    setLedMode(LED_BOOT);
    ultimoIntento = millis();
    break;

  case STATE_INIT:
    setLedMode(LED_BOOT);
    if (modem.restart()) {
      if (GSM_PIN && modem.getSimStatus() != 3)
        modem.simUnlock(GSM_PIN);
      estadoActual = STATE_WAIT_NETWORK;
    } else {
      manejarError();
    }
    ultimoIntento = millis();
    break;

  case STATE_WAIT_NETWORK:
    setLedMode(LED_CONNECTING);
    if (modem.waitForNetwork(15000L)) {
      contadorErrores = 0;
      estadoActual = STATE_CONNECT_GPRS;
    } else {
      manejarError();
    }
    ultimoIntento = millis();
    break;

  case STATE_CONNECT_GPRS:
    setLedMode(LED_CONNECTING);
    if (modem.gprsConnect(apn, gprsUser, gprsPass)) {
      contadorErrores = 0;
      estadoActual = STATE_IDLE_LISTENING;
      setLedMode(LED_READY);

      // ¡Notificamos al Heltec que estamos listos!
      enviarEventoAlHeltec("READY");
    } else {
      manejarError();
    }
    ultimoIntento = millis();
    break;

  case STATE_IDLE_LISTENING:
    // Comprobación de salud rápida (cada 10 segundos para no bloquear)
    static unsigned long lastHealthCheck = 0;
    if (millis() - lastHealthCheck > 10000) {
      if (!modem.isNetworkConnected() || !modem.isGprsConnected()) {
        enviarEventoAlHeltec("LOST_NETWORK"); // Avisamos al máster de la caída
        estadoActual = STATE_WAIT_NETWORK;
      }
      lastHealthCheck = millis();
    }
    break;

  case STATE_ERROR:
    estadoActual = STATE_HARD_RESET;
    setLedMode(LED_BOOT);
    ultimoIntento = millis();
    break;
  }
}

void manejarError() {
  contadorErrores++;
  if (contadorErrores >= MAX_ERRORES)
    estadoActual = STATE_ERROR;
}

// ==========================================
// FUNCIONES DE COMUNICACIÓN CON EL HELTEC
// ==========================================

void escucharUART() {
  while (SerialMon.available()) {
    char c = SerialMon.read();
    if (c == '\n') {
      // Mensaje completo recibido
      procesarComandoJSON(rxBuffer);
      rxBuffer = "";
    } else if (c != '\r') {
      rxBuffer += c;
    }
  }
}

void procesarComandoJSON(const String &jsonStr) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, jsonStr);

  // Si no es un JSON válido, lo ignoramos para no bloquearnos
  if (error)
    return;

  String cmd = doc["cmd"];

  if (cmd == "SEND") {
    // Extraemos la parte "data" (que es otro JSON anidado) y la convertimos de
    // nuevo a String
    serializeJson(doc["data"], payloadParaEnviar);
    ordenPendienteSend =
        true; // Levantamos la bandera para procesarlo en el loop()
  } else if (cmd == "GET") {
    // Extraemos la ruta a consultar
    pathParaGet = doc["path"].as<String>();
    ordenPendienteGet =
        true; // Levantamos la bandera para procesarlo en el loop()
  }
}

void enviarEventoAlHeltec(String evento) {
  JsonDocument doc;
  doc["event"] = evento;

  if (evento == "READY") {
    doc["csq"] = modem.getSignalQuality(); // Enviamos la cobertura
  }

  serializeJson(doc, SerialMon);
  SerialMon.println(); // ¡CRÍTICO! El salto de línea para que el Heltec sepa
                       // que terminó
}

void enviarRespuestaHTTP(bool ok, int httpCode, String respuestaServidor) {
  JsonDocument doc;
  doc["event"] = "SEND_DONE";
  doc["ok"] = ok;
  doc["code"] = httpCode;

  // Si el servidor devolvió un JSON (ej. configuraciones downlink para las
  // motas), lo inyectamos
  if (respuestaServidor.length() > 0) {
    JsonDocument serverDoc;
    if (!deserializeJson(serverDoc, respuestaServidor)) {
      doc["response"] = serverDoc;
    } else {
      doc["response"] = respuestaServidor; // Si es texto plano
    }
  }

  serializeJson(doc, SerialMon);
  SerialMon.println();
}

// ==========================================
// FUNCIONES DE CONTROL LED
// ==========================================

void setRGB(int r, int g, int b) {
  // Asumiendo LED de cátodo común (HIGH enciende)
  digitalWrite(PIN_RED, r ? HIGH : LOW);
  digitalWrite(PIN_GREEN, g ? HIGH : LOW);
  digitalWrite(PIN_BLUE, b ? HIGH : LOW);
}

void ledTaskCode(void *pvParameters) {
  unsigned long lastLedToggle = 0;
  bool ledState = false;
  LEDMode localMode = LED_BOOT;

  for (;;) {
    unsigned long now = millis();
    int interval = 500;

    if (ledMutex != NULL) {
      if (xSemaphoreTake(ledMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        localMode = currentLedMode;
        xSemaphoreGive(ledMutex);
      }
    } else {
      localMode = currentLedMode; // Failsafe
    }

    switch (localMode) {
    case LED_BOOT:
      setRGB(1, 0, 0); // Rojo Fijo
      break;

    case LED_READY:
      setRGB(0, 1, 0); // Verde Fijo
      break;

    case LED_CONNECTING:
      interval = 500; // Parpadeo medio
      if (now - lastLedToggle > interval) {
        ledState = !ledState;
        ledState ? setRGB(0, 0, 1) : setRGB(0, 0, 0); // Azul
        lastLedToggle = now;
      }
      break;

    case LED_TRAFFIC:
      interval = 100; // Parpadeo muy rápido
      if (now - lastLedToggle > interval) {
        ledState = !ledState;
        ledState ? setRGB(1, 1, 0) : setRGB(0, 0, 0); // Amarillo
        lastLedToggle = now;
      }
      break;

    default:
      setRGB(0, 0, 0);
      break;
    }

    vTaskDelay(
        pdMS_TO_TICKS(50)); // Pausa de 50ms para ceder el control al procesador
  }
}

// ==========================================
// EJECUCIÓN HTTP POST
// ==========================================

void realizarPost(String payload) {
  setLedMode(LED_TRAFFIC);
  HttpClient http(client, server, port);
  http.setHttpResponseTimeout(15000);

  http.beginRequest();
  http.post(bigPacketPath);
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", payload.length());
  http.sendHeader(headerDeviceId, deviceIdValue);
  http.sendHeader(headerDeviceToken, deviceTokenValue);
  http.beginBody();
  http.print(payload);
  http.endRequest();

  int statusCode = http.responseStatusCode();
  String responseBody = http.responseBody();

  http.stop(); // Liberar socket

  // Evaluamos si el envío fue exitoso (códigos 200 a 299)
  bool success = (statusCode >= 200 && statusCode < 300);

  // Mandamos el resultado final al Heltec por UART
  enviarRespuestaHTTP(success, statusCode, responseBody);
  setLedMode(LED_READY);
}

// ==========================================
// EJECUCIÓN HTTP GET
// ==========================================

void realizarGet(String path) {
  setLedMode(LED_TRAFFIC);
  HttpClient http(client, server, port);
  http.setHttpResponseTimeout(15000);

  http.beginRequest();
  http.get(path.c_str());
  http.sendHeader(headerDeviceId, deviceIdValue);
  http.sendHeader(headerDeviceToken, deviceTokenValue);
  http.endRequest();

  int statusCode = http.responseStatusCode();
  String responseBody = http.responseBody();

  http.stop(); // Liberar socket

  // Evaluamos si la petición fue exitosa (códigos 200 a 299)
  bool success = (statusCode >= 200 && statusCode < 300);

  // Mandamos el resultado final al Heltec por UART (mismo protocolo SEND_DONE)
  enviarRespuestaHTTP(success, statusCode, responseBody);
  setLedMode(LED_READY);
}