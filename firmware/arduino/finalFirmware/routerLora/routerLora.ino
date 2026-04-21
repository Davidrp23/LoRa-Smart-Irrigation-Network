#include "Arduino.h"

//Libraries for LoRa
#include "LoRaWan_APP.h"

// Our modules
#include "types.h"
#include "config.h"
#include "display.h"
#include "network.h"
#include "storage.h"
#include "lora_router.h"
#include "images.h"
#include "SerialAM.h"

//---------------------------------------------------------VEXTON-----------------------------------------------------------------------

void VextON(void)
{
  pinMode(Vext,OUTPUT);
  digitalWrite(Vext, LOW);
}

//-----------------------------------------------------------VEXTOFF----------------------------------------------------------

void VextOFF(void) //Vext default OFF
{
  pinMode(Vext,OUTPUT);
  digitalWrite(Vext, HIGH);
}
//--------------------------------------------------------GLOBAL VARIABLES--------------------------------------------------------------

//Operating Router Params
const size_t routerId = 1; // Los id son siempre > 0

//Pueden cambiar durante la ejecucion
char SSID[SSID_LENGTH] = "TOM_SUR";
bool isPublic = true;
size_t channel = CHANEL_1;
int8_t numChannel = -1;
uint16_t version = 0; // Version de la configuracion del router

// Variables de control para el test del AM-036
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 30000; // Enviar cada 30 segundos


// Lista de canales seguros (en Hz)
// Separación de 200kHz para evitar solapamiento de señal de 125kHz
const uint32_t channelList[NUM_CHANELS] = {
    CHANEL_0, // Canal 0 (Estándar)
    CHANEL_1, // Canal 1 (Estándar)
    CHANEL_2, // Canal 2 (Estándar)
    CHANEL_3  // Canal 3 (Alta potencia / Reserva)
};

//Configuracion ficticia para las motas
//Respuesta ficticia big-packet servidor

String bigPacketResponse = R"raw(
{
    "ok": true,
    "conf": [
        {
            "tg": "r",
            "id": 1,
            "v": 7,
            "p": {
                "c": 2,
                "s": "RED_XLP",
                "eP": false
            }
        },
        {
            "tg": "m",
            "id": 50,
            "v": 7,
            "p": {
                "f": 240,
                "cP": true
            }
        }
    ]
}
)raw";

//----------------------------------------------------------------------------------------------------------------------------------------

void setup() {

  Mcu.begin(HELTEC_BOARD,SLOW_CLK_TPYE);

  VextON();
  
  //initialize Serial Monitor
  Serial.begin(115200);

  //Imprimimos el logo de inicio por serie
  Serial.println(SerialLogoFlora);
  
  Serial.println("Iniciando Router");

  initRouterStorage(); // Cargamos la configuracion guardada en flash

  initializeLora();

  AMConf();
  
  numChannel = findChannelNumber(channel);
  
  initializeOled();

  NETWORK_DATA.router = routerId;
  memcpy(&NETWORK_DATA.SSID, SSID, SSID_LENGTH);
  NETWORK_DATA.isPublic = isPublic;

  // --- FREERTOS SETUP ---
  
  // 1. Crear el semáforo (Mutex)
  statsMutex = xSemaphoreCreateMutex();

  buttonStateMutex = xSemaphoreCreateMutex();

  // 2. Crear la tarea en el Core 0
  xTaskCreatePinnedToCore(
    TaskDisplay,    // Función de la tarea
    "DisplayTask",  // Nombre (para depuración)
    4096,           // Tamaño de pila (Stack size) en words
    NULL,           // Parámetros
    1,              // Prioridad (1 = Baja, suficiente para pantalla)
    NULL,           // Handle de la tarea
    0               // Core ID (0 = Protocolo/Display, 1 = Arduino Loop)
  );

  //parseBigPacketResponse(bigPacketResponse);
  

  Serial.println("Sistema Multitarea Iniciado.");

}

void loop() {
  // put your main code here, to run repeatedly:
  Radio.IrqProcess( );

  //GESTION BOTON:
  checkButton(); 
  

  // 2. LÓGICA DE ENVÍO DE DATOS
  // Si estamos listos para enviar y el estado interno del objeto es IDLE
  if (canSend && am036.getState() == AMState::IDLE) {
    
    // Comprobamos si ya han pasado 30 segundos desde el último envío
    if (millis() - lastSendTime > SEND_INTERVAL) {
      
      Serial.println("[MAIN] Preparando JSON de prueba...");
      
      // Creamos un JSON de prueba (Simulando datos de las motas FLoRa)
      JsonDocument payloadDoc;
      payloadDoc["router_id"] = "FLoRa_Gateway_01";
      payloadDoc["mota_id"] = 12;
      payloadDoc["temp"] = random(20, 35); // Datos dummy
      payloadDoc["hum"] = random(40, 80);
      payloadDoc["bat"] = 3.85;

      String jsonString;
      serializeJson(payloadDoc, jsonString);

      // Le pasamos el payload a la librería
      if (am036.sendBigPacket(jsonString)) {
        Serial.println("[MAIN] Paquete enrutado al AM-036 exitosamente.");
        canSend = false; // Bloqueamos hasta que el callback nos avise del resultado HTTP
        lastSendTime = millis();
      } else {
        Serial.println("[MAIN] Fallo interno: No se pudo enrutar el paquete.");
      }
    }
  }

}


