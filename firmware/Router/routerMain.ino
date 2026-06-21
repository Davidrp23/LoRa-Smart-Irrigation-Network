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
#include "AMcontrol.h"
#include "gps.h"
#include "fuelGauge.h"
#include "rtc_sync.h"

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

// Lista de canales seguros (en Hz)
// Separación de 200kHz para evitar solapamiento de señal de 125kHz
const uint32_t channelList[NUM_CHANELS] = {
    CHANEL_0, // Canal 0 (Estándar)
    CHANEL_1, // Canal 1 (Estándar)
    CHANEL_2, // Canal 2 (Estándar)
    CHANEL_3  // Canal 3 (Alta potencia / Reserva)
};

//----------------------------------------------------------------------------------------------------------------------------------------

void setup() {

  Mcu.begin(HELTEC_BOARD,SLOW_CLK_TPYE);

  VextON();

  pinMode(BUTTON_PIN, INPUT);
  
  //initialize Serial Monitor
  Serial.begin(115200);

  //Imprimimos el logo de inicio por serie
  Serial.println(SerialLogoFlora);
  
  Serial.println("Iniciando Router");

  Serial.printf("ESP.getFreeHeap() Antes de arrancar todo: %u\n",ESP.getFreeHeap());

  initRouterStorage(); // Cargamos la configuracion guardada en flash

  initializeLora();

  rxQueue = xQueueCreate(RX_QUEUE_LEN, RX_MSG_SIZE);

  numChannel = findChannelNumber(channel);
  
  initializeOled();

  NETWORK_DATA.router = routerId;
  memcpy(&NETWORK_DATA.SSID, SSID, SSID_LENGTH);
  NETWORK_DATA.isPublic = isPublic;

  // --- FREERTOS SETUP ---
  
  // 1. Crear los semáforos (Mutexes)
  statsMutex = xSemaphoreCreateMutex();
  buttonStateMutex = xSemaphoreCreateMutex();
  networkMutex = xSemaphoreCreateMutex();
  
  // Semáforo binario para el control de la radio LoRa
  loraTxSemaphore = xSemaphoreCreateBinary();
  xSemaphoreGive(loraTxSemaphore); // Inicialmente la radio está libre

  // Inicializar el reloj software (se calibrará con el backend en el primer big-packet)
  rtcSyncInit();

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

  // 3. Tarea de procesamiento de paquetes LoRa recibidos (consume rxQueue)
  //    Prioridad 2: mayor que Display para responder rapidamente al trafico radio.
  //    Corre en Core 0 junto con Display para no interferir con el loop() de Radio.
  xTaskCreatePinnedToCore(
    loraRxProcessTask,  // Función de la tarea
    "LoRaRxTask",       // Nombre (para depuración)
    8192,               // Stack generoso: valida checksum, crypto y llama a process()
    NULL,               // Parámetros
    2,                  // Prioridad (2 = mayor que Display)
    NULL,               // Handle de la tarea
    0                   // Core ID
  );

  AMSetup();

  startUplinkTask();

  // GPS: configurar MOSFET y pines en INPUT (seguro)
  routerGpsInit();

  // Fuel Gauge: inicializar MAX17043 y arrancar tarea de lectura periódica
  
  if (fuelGaugeSetup()) {
    xTaskCreatePinnedToCore(
        fuelGaugeTask,   // función
        "FuelGauge",     // nombre debug
        4096,            // 4KB
        nullptr,         // sin parámetros
        1,               // prioridad baja (solo lectura I2C periódica)
        nullptr,         // sin handle
        0                // Core 0 junto al display
    );
  }
  
  Serial.println("Sistema Multitarea Iniciado.");
  Serial.printf("ESP.getFreeHeap() Despues de iniciar todo: %u\n",ESP.getFreeHeap());

}

void loop() {
  // put your main code here, to run repeatedly:
  Radio.IrqProcess( );

  //GESTION BOTON:
  checkButton(); 
  

  // El uplink al AM-036 lo gestiona completamente uplink_manager_task (Core 0).
  // El loop() solo necesita procesar las interrupciones de radio LoRa y el botón.

}


