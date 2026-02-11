#define TINY_GSM_MODEM_SIM800
#define SerialMon Serial
#define SerialAT Serial1
#define TINY_GSM_DEBUG SerialMon
#define GSM_PIN ""


#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>


#ifdef DUMP_AT_COMMANDS
#include <StreamDebugger.h>
StreamDebugger debugger(SerialAT, SerialMon);
TinyGsm modem(debugger);
#else
TinyGsm modem(SerialAT);
#endif


// ESP32 and SIM800l pins
#define MODEM_RST 5
#define MODEM_PWKEY 4
#define MODEM_POWER_ON 23
#define MODEM_TX 27
#define MODEM_RX 26
#define I2C_SDA 21
#define I2C_SCL 22


TinyGsmClient client(modem);

// Define los datos de tu operador (Movistar España suele ser este)
const char apn[]  = "movistar.es";
const char gprsUser[] = "movistar";
const char gprsPass[] = "movistar";

const char* number = "+34684457438";

// Configuración del servidor
const char server[] = "httpbin.org";
const int  port   = 80;



void setup() {
  SerialMon.begin(115200);
  delay(1000);
  pinMode(MODEM_PWKEY, OUTPUT);
  pinMode(MODEM_RST, OUTPUT);
  pinMode(MODEM_POWER_ON, OUTPUT);

  digitalWrite(MODEM_PWKEY, LOW);
  digitalWrite(MODEM_RST, HIGH);
  digitalWrite(MODEM_POWER_ON, HIGH);

  SerialMon.println("Wait ...");
  SerialAT.begin(9600, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);
  SerialMon.println("Initializing modem ...");
  modem.restart();

  String modemInfo = modem.getModemInfo();
  SerialMon.print("Modem Info: ");
  SerialMon.println(modemInfo);

  // Unlock your sim card with a PIN if needed
  if (GSM_PIN && modem.getSimStatus() != 3) {
    modem.simUnlock(GSM_PIN);
  }
  SerialMon.print("Waiting for network...");
  if (!modem.waitForNetwork(240000L)) {
    SerialMon.println(" fail");
    delay(10000);
    return;
  }
  SerialMon.println(" success");

  if (modem.isNetworkConnected()) {
    DBG("Network connected");
  }
  
  SerialMon.print("Conectando a GPRS (Internet)... ");
  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
    SerialMon.println(" fail");
    delay(10000);
    return;
  }
  SerialMon.println(" success");

  if (modem.isGprsConnected()) {
    SerialMon.println("GPRS conectado");
  }

  String ccid = modem.getSimCCID();
  DBG("CCID:", ccid);

  String imei = modem.getIMEI();
  DBG("IMEI:", imei);

  String imsi = modem.getIMSI();
  DBG("IMSI:", imsi);

  String cop = modem.getOperator();
  DBG("Operator:", cop);

  IPAddress local = modem.localIP();
  DBG("Local IP:", local);

  // Signal quality (0–31, 99 = not known)
  int signalQuality = modem.getSignalQuality();
  SerialMon.print("Signal Quality (0-31): ");
  SerialMon.println(signalQuality);

  //callSomeOne(number);
  //sendSMS("+34684457438", "Hola! El ESP32 con SIM800L esta vivo.");
  hacerGet("/get");

}

void loop() {
  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 5000) { // every 5 seconds
    int signal = modem.getSignalQuality();
    SerialMon.print("Signal Quality (0-31): ");
    SerialMon.println(signal);

    // Optional: Check if still connected
    if (!modem.isNetworkConnected()) {
      SerialMon.println("Network disconnected!");
    } else {
      SerialMon.println("Network OK");
    }

    lastPrint = millis();
  }

  delay(100);
}

void callSomeOne(const char* number){

  SerialMon.print("Llamando a: ");
  SerialMon.println(number);

  // Realiza la llamada
  bool res = modem.callNumber(number);

  if (res) {
    SerialMon.println("Llamada iniciada correctamente.");
    
    // Esperar 10 segundos antes de colgar
    delay(10000);
    
    // Colgar la llamada
    modem.callHangup();
    SerialMon.println("Llamada finalizada.");
  } else {
    SerialMon.println("Error al intentar llamar.");
  }
}

void sendSMS(String number, String msg) {
  SerialMon.print("Enviando SMS a ");
  SerialMon.print(number);
  SerialMon.print(": ");
  SerialMon.println(msg);

  // Intentar enviar el mensaje
  bool resultado = modem.sendSMS(number, msg);

  if (resultado) {
    SerialMon.println("¡SMS enviado con éxito!");
  } else {
    SerialMon.println("Error al enviar el SMS.");
  }
}

void hacerGet(String path) {
  SerialMon.println("Iniciando petición GET...");
  
  // Creamos el cliente HTTP
  HttpClient http(client, server, port);

  // Realizamos la petición
  int err = http.get(path);
  if (err != 0) {
    SerialMon.println("Error al conectar");
    return;
  }

  // Leemos el código de estado (ej: 200 si es OK, 404 si no existe)
  int status = http.responseStatusCode();
  SerialMon.print("Código de estado: ");
  SerialMon.println(status);

  if (status <= 0) {
    return; 
  }

  // Leemos el cuerpo de la respuesta
  String body = http.responseBody();
  SerialMon.println("Respuesta del servidor:");
  SerialMon.println(body);
}