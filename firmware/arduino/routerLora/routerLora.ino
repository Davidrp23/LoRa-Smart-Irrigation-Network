#include "Arduino.h"

//Libraries for LoRa
#include "LoRaWan_APP.h"


//Libraries for OLED Display
#include <Wire.h>               
#include "HT_SSD1306Wire.h"

//Icons
#include "images.h"

// --- FreeRTOS ---
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/semphr.h"

// -- AM-036 --
#include <vector> //Para guardar los datos de las motas
#include <ArduinoJson.h> //Para comunicarse con el AM-036
#define MAX_MOTAS_EN_COLA 40 //Numero maximo de datos para las motas en cola

#define MAX_CLIENTS 30
#define SSID_LENGTH 8 + 1 // +1 para el terminador nulo

//----------------------------------LORA_PARAMETERS----------------------------------
#define NUM_CHANELS 4

#define CHANEL_0 868100000
#define CHANEL_1 868300000
#define CHANEL_2 868500000
#define CHANEL_3 869525000


#define TX_OUTPUT_POWER                             5        // dBm

#define LORA_BANDWIDTH                              0         // [0: 125 kHz,
                                                              //  1: 250 kHz,
                                                              //  2: 500 kHz,
                                                              //  3: Reserved]
#define LORA_SPREADING_FACTOR                       7         // [SF7..SF12]
#define LORA_CODINGRATE                             1         // [1: 4/5,
                                                              //  2: 4/6,
                                                              //  3: 4/7,
                                                              //  4: 4/8]
#define LORA_PREAMBLE_LENGTH                        8         // Same for Tx and Rx
#define LORA_SYMBOL_TIMEOUT                         0         // Symbols
#define LORA_FIX_LENGTH_PAYLOAD_ON                  false
#define LORA_IQ_INVERSION_ON                        false


#define RX_TIMEOUT_VALUE                            1000
#define MAX_PAYLOAD_SIZE 240 // Max size for the Data field

//Lora chip events functions
static RadioEvents_t RadioEvents;
void OnTxDone( void );
void OnTxTimeout( void );
void OnRxDone( uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr );

//-------------------------------------STRUCTS------------------------------------------------- 

enum class messageType : uint8_t {

    // --- Solicitud y Descubrimiento ---
    BEACON_REQUEST = 0x00,      // La mota envia este mensaje para descubir nuevos routers a los que conectarse.
    
    BEACON_RESPONSE = 0x01,    // El router responde a un BEACON_REQUEST con un un BEACON_RESPONSE dando informacion de la red que gestiona.

    JOIN_REQUEST = 0x02,      // Solicitud de union a la red.
    
    JOIN_ACCEPTED = 0x03,     // Respuesta del coordinador que acepta la solicitud. 
    
    JOIN_DENIED = 0x04,       // Respuesta del coordinador que deniega la solicitud de unión.

    NODE_BLOCKED = 0x05,      // Mensaje del coordinador para informar a un nodo que está bloqueado.

    NODE_LEAVING = 0x06,      // Mensaje de un nodo que desea salir de la red de forma controlada.

    NODE_LEAVING_ACK = 0x07,  //Mensaje para informar al nodo de que ha sido eliminado de la red.
    
    // ---  Mensajes de Datos ---
    DATA = 0x20,     // Paquete que contiene la carga útil de datos, entre ellos se encuentra la huedad, bateria y localizacion.

    DATA_CONF = 0x21, //Paquete que contiene datos de configuracion para la mota, confirma que ha recibido sus datos en el paquete anterior (piggibacking), 
    //se aprovecha para confirmar y enviar nueva configuracion. Si no hubiera configuracion nueva se confirman los datos recibidos en el paquete anterior con DATA_ACK.
    //Solo se envia la configuracion cuando la mota se despierta y envia datos, en otro momento esta dormida.

    DATA_CONF_ACK = 0x22, //Paquete que confirma que la mota ha recibido la configuracion enviada anteriormente en un paquete tipo DATA_CONF.

    DATA_ACK = 0x23, // Acknowledge (Confirmación) de recepción de DATA.

    INVALID = 0xFF  // Default o desconocido
    
};

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene los ID del router y mota que se estan comunicando, estos campos se usan para evitar que otras motas/router procesen un paquete que no van para ellos.

  size_t router; //Router al que va destinado el paquete, siempre > 0 

  size_t id; // ID desde el que proviene el paquete, siempre > 0

}ControlData;

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene el ID del router que manda el beacon frame, asi como el SSID de la red 

  size_t router; //Router que gestiona la red anunciada

  char SSID[SSID_LENGTH]; //Nombre descriptivo de la red anunciada, se muestra en la pantalla oled de las motas en el proceso de vinculacion.

  bool isPublic; //Indica si el router es publico o privado


}NetworkData;

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene los ID del router y mota que se estan comunicando, estos campos se usan para evitar que otras motas/router procesen un paquete que no van para ellos.

  size_t router; //ID Router que manda el paquete, siempre > 0 

  size_t id; // ID mota a la que va destinada la configuracion, siempre > 0

  size_t sendInterval; // Periodo en segundos que la mota tarda en enviar informacion

  int8_t allowPublicConn; // Variable que le permite a la mota conectarse a routers publicos si el propio falla
                        //Deberia ser bool, pero como el sistema de actualizaccion de configuraciones es de tipo delta
                        //hay parametros del backend que no vienen, pero en LoRa tenemos que incluirlo (sino el struct se llena con la basura de la RAM)
                        //Necesitamos 3 estados:
                        // 1: allowPublicConn = -1 <-- No se aplica, la mota mantiene su valor 
                        // 2: allowPublicConn = 0 <-- Se aplica, no se permiten conexiones publicas
                        // 3: allowPublicConn = 1 <-- Se aplica, se permiten conexiones publicas

  uint16_t version; // Version de la configuracion de la mota a aplicar

}ConfData;

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene los ID del router y mota que se estan comunicando, estos campos se usan para evitar que otras motas/router procesen un paquete que no van para ellos.
  //Ademas de los ID contiene los datos que recopila la mota.

  size_t router; //Router al que va destinado el paquete, siempre > 0

  size_t id; // ID desde el que proviene el paquete, siempre > 0

  uint8_t humidity;

  uint8_t battery;

  float latitude; // Mejor mandar las coordenadas como 2 float (4B cada uno) que como un array de caracteres (Ahorramos espacio).

  float longitude;

  uint16_t version; // Version de la configuracion de la mota
  
}SensorsData;

// Se usa __attribute__((packed)) para asegurar que el compilador no añada relleno (padding)
// entre los campos, garantizando que el struct tenga exactamente el tamaño esperado.
typedef struct __attribute__((packed)) {
    // 1. Tipo de Mensaje (1 Byte)
    messageType type; 
    
    // 2. Longitud de los datos (1 Byte) - Es vital para saber cuántos bytes son DATA real.
    uint8_t length;

    // 3. Checksum (2 Bytes)
    uint16_t checksum;  
    
    // 4. Carga Útil (Máximo 240 Bytes)
    union {
      uint8_t raw[MAX_PAYLOAD_SIZE];
      NetworkData NetworkData;
      ControlData ControlData;
      ConfData ConfData;
      SensorsData SensorsData;
    } data;
    
} LoRaMessage;

//---------------------------------------------------------------------------------------------------------------------------------------

static SSD1306Wire  display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED); // addr , freq , i2c group , resolution , rst

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

//------------------------------

// Candado para proteger las variables compartidas
SemaphoreHandle_t statsMutex; 
SemaphoreHandle_t buttonStateMutex; 

// Estructura para pasar datos de forma segura a la pantalla
struct DisplayStats {
  size_t rx_pkts;
  size_t tx_pkts;
  size_t rx_err;
  size_t tx_err;
  size_t last_client;
  int16_t last_rssi;
  size_t queueFull;
  uint8_t queueSize;
  uint8_t waiting_conf;
};

// Variables globales oled
volatile size_t shared_rx = 0;
volatile size_t shared_tx = 0;
volatile size_t shared_rx_err = 0;
volatile size_t shared_tx_err = 0;
volatile int16_t shared_rssi = 0;
volatile size_t shared_queueFull = 0;
volatile uint8_t shared_queueSize = 0;
volatile uint8_t shared_waiting_conf = 0;

//Router params
size_t connectedClients[MAX_CLIENTS];
std::vector<SensorsData> motasDataQueue; //Cola para almacenar los datos de las motas
std::vector<ConfData> motasConf; //Cola para almacenar las configuraciones de las motas

uint8_t activeClients = 0;

NetworkData NETWORK_DATA;
size_t shared_lastClient = 0;

// Lista de canales seguros (en Hz)
// Separación de 200kHz para evitar solapamiento de señal de 125kHz
const uint32_t channelList[] = {
    CHANEL_0, // Canal 0 (Estándar)
    CHANEL_1, // Canal 1 (Estándar)
    CHANEL_2, // Canal 2 (Estándar)
    CHANEL_3  // Canal 3 (Alta potencia / Reserva)
};

// const uint8_t totalChannels = 4;

// --- ESTADOS DEL BOTÓN (Variable Global) ---
// Usamos un enum para que sea legible en cualquier parte del código
enum ButtonEvent {
  NO_PRESS,     // Nada ha pasado
  SHORT_PRESS,  // Pulsación corta detectada
  LONG_PRESS    // Pulsación larga detectada
};

// --- VARIABLES INTERNAS (No tocar desde fuera) [button press] ---
unsigned long pressStartTime = 0;
bool isPressing = false;
volatile ButtonEvent globalButtonState = NO_PRESS;
//OLED UI 
bool defaultMenu = 1; //Indica que vista del menu se tiene. 1 indica los datos visualizados por defecto 0 los demas... Todos no caben en 1 pantalla

// --- CONSTANTES DE TIEMPO ---
#define BUTTON_PIN 0            // Botón PRG en Heltec V3
#define DEBOUNCE_MS 50          // Filtro para rebotes
#define LONG_PRESS_MS 1000      // Tiempo para considerar pulsación larga (1s)

//Configuracion ficticia para las motas
//Respuesta ficticia big-packet servidor

String bigPacketResponse = R"raw(
{
    "ok": true,
    "conf": [
        {
            "tg": "r",
            "id": 1,
            "v": 4,
            "p": {
                "c": 2,
                "s": "RED_LEB",
                "eP": true
            }
        },
        {
            "tg": "m",
            "id": 2,
            "v": 7,
            "p": {
                "f": 240,
                "cP": false
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

  initializeLora();

  numChannel = findChannelNumber(channel);
  
  initializeOled();

  NETWORK_DATA.router = routerId;
  mempcpy(&NETWORK_DATA.SSID, SSID, SSID_LENGTH);
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

  parseBigPacketResponse(bigPacketResponse);

  Serial.println("Sistema Multitarea Iniciado.");

}


void loop() {
  // put your main code here, to run repeatedly:
  Radio.IrqProcess( );

  //GESTION BOTON:
  checkButton(); 

}

void OnTxDone( void ){

  Serial.print("TX done......");

  if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
    shared_tx++;
    xSemaphoreGive(statsMutex);
  }

  Radio.Rx( 0 );
}

void OnTxTimeout( void )
{
  Serial.print("TX Timeout......");

  if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
    shared_tx_err++;
    xSemaphoreGive(statsMutex);
  }

  //De momento si ocurre esto, no enviaremos respuesta.
  Radio.Rx( 0 );
}

void OnRxDone( uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr )
{
  LoRaMessage incomingMessage; 

  // Define el tamaño mínimo de un paquete (Headers sin payload, 4B):
  const size_t MIN_PACKET_SIZE = sizeof(messageType) + sizeof(uint8_t) + sizeof(uint16_t); // 4 bytes (messageType, length, checksum)
  
  if (size >= MIN_PACKET_SIZE) {
    
    memcpy(&incomingMessage, payload, min((size_t)size , (size_t)MIN_PACKET_SIZE + (size_t)MAX_PAYLOAD_SIZE));

    size_t expectedSize = MIN_PACKET_SIZE + incomingMessage.length;

    if (size == expectedSize) {

      uint16_t expectedChecksum = calculateChecksum(incomingMessage);
      
      if(expectedChecksum == incomingMessage.checksum){

        if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
          shared_rx++;
          shared_rssi = rssi;
          xSemaphoreGive(statsMutex);
        }

        //Debug
        packageToSerial(incomingMessage, size, rssi, snr);

        process(incomingMessage);

      }else{

        // checksum invalido, hay datos corruptos

        if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
          shared_rx_err++;
          xSemaphoreGive(statsMutex);
        }

        Serial.print("Error de checksum, checksum del mensaje: ");
        Serial.print(incomingMessage.checksum);
        Serial.print(", checksum calculado: ");
        Serial.println(expectedChecksum);

      }

    } else {
      // El campo 'length' indica X, pero el paquete recibido era Y. Error de protocolo.

      if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
        shared_rx_err++;
        xSemaphoreGive(statsMutex);
      }

      Serial.print("Error de longitud en el protocolo! Paquete real: ");
      Serial.print(size);
      Serial.print(", Esperado por Header: ");
      Serial.println(expectedSize);
    }
    
  } else if (size > 0) {
    // Paquete demasiado pequeño para siquiera contener los headers (corrupto)
    
    if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
      shared_rx_err++;
      xSemaphoreGive(statsMutex);
    }

    Serial.print("Paquete demasiado corto (");
    Serial.print(size);
    Serial.print(" bytes). Mínimo: ");
    Serial.print(MIN_PACKET_SIZE);
    Serial.println(" bytes.");
  }

}

void process(LoRaMessage incomingPackage){


  if(incomingPackage.type == messageType::BEACON_REQUEST){ //El nodo solicita un BEACON_RESPONSE para descubir nuevos routers. -- RECIBE UN MENSAJE "BROADCAST"
    
    sendBeaconResponse();

  }else{ //RECIBE UN MENSAJE "DIRIGIDO"

    //Para todos los tipos excepto DATA, la carga util del paquete se interpreta como un ControlData, para recurperar el id y el router da igual como interpretemos el union ya que en 
    //los 2 casos se encuentran en la misma posicion.

    const size_t CLIENT_ID = incomingPackage.data.ControlData.id;
    const size_t DESTINATION_ROUTER = incomingPackage.data.ControlData.router;

    if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
      shared_lastClient = CLIENT_ID;
      xSemaphoreGive(statsMutex);
    }

    if(DESTINATION_ROUTER == routerId){

      Serial.println("Se ha recibido un paquete con destino este router.");
      
      switch(incomingPackage.type){

        //Para no formar bucles infinitos, el nodo y el router tendran 3 ciclos para completar la comunicacion, en caso de 3 fallos reiterados se cancelara la comunicacion

        case messageType::DATA : // El nodo adjunta datos recolectado por sus sensores

          if(getClientIndex(CLIENT_ID) == (char)-1){
            Serial.println("Se ha recibido un paquete de datos de una mota que NO estaba en la red, enviando respuesta...");
            sendControlPacket(messageType::JOIN_REQUEST, CLIENT_ID); //El JOIN_REQUEST solo lo envia la mota para conectarse a la red que gestiona el router, cuando el router lo envia como 
            //respuesta a un paquete anterior quiere decir que se requiere unirse a la red para enviar ese paquete (porque no lo esta actualmente), la mota interpretara ese paquete como que no esta en la red,
            //pero deberia estarlo, por algun motivo se ha perdido la lista de clientes conectados, asi que enviara de vuelta un JOIN_REQUEST para unirse de nuevo a la misma.
            //No se tendra en cuenta la trama de datos en estos casos.
          }else{
           Serial.println("Se ha recibido un paquete de datos. Guardando en cola local...");
            
            // 1. Modificamos el vector de forma segura (Solo el Core 1 está tocando esto)
            if (motasDataQueue.size() >= MAX_MOTAS_EN_COLA) {
                motasDataQueue.erase(motasDataQueue.begin());
                
                // Actualizamos estadística de desbordamiento de cola
                if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
                  shared_queueFull++;
                  xSemaphoreGive(statsMutex);
                }
            }
            motasDataQueue.push_back(incomingPackage.data.SensorsData);  

            // 2. Actualizamos la variable para la pantalla OLED (Protegida)
            if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
              shared_queueSize = motasDataQueue.size();
              xSemaphoreGive(statsMutex);
            }

            // 3. Miramos si para la mota hay una configuracion pendiente:
            ConfData configMota = searchMotaConf(CLIENT_ID);

            if (configMota.id != 0) { //La mota tiene una configuracion pendiente, se la enviamos, ademas con esto hacemos un ack implicito (piggybacking)
              sendConfigPacket(configMota);
              //No eliminamos la configuracion hasta recibir DATA_CONF_ACK
            } else { //No hay configuracion para la mota, ack normal
              sendControlPacket(messageType::DATA_ACK, CLIENT_ID);
            }
          }
          break;

        case messageType::JOIN_REQUEST : // El nodo solicita unirse a la red gestionada por este router, aceptamos o denegamos empleando las cabeceras adecuadas

        //Por ahora siempre va a aceptar la peticion de union.

          Serial.printf("El nodo %d esta intentando conectarse a la red.\n", CLIENT_ID);
          
          //Comprobamos si el cliente esta conectado ya a la red
          if(getClientIndex(CLIENT_ID) == (char)-1){
            //Incorporamos al nodo a la lista de clientes conectados
            addClient(CLIENT_ID);
            Serial.printf("El nodo %d se ha conectado a la red.\n", CLIENT_ID);
            //Le informamos de que ha sido incorporado en la red
          }else{
            Serial.printf("El nodo %d se ha intentado conectar a la red, pero ya estaba conectado.\n", CLIENT_ID);
            //Le respondemos que aceptamos su peticion pero no hacemos cambios en la lista de clientes.
          }
          sendControlPacket(messageType::JOIN_ACCEPTED, CLIENT_ID);
          break;

        case messageType::NODE_LEAVING : //El nodo solicita salirse de la Red que gestiona este router, el router envia NODE_LEAVING_ACK para aceptar la salida del nodo y terminar la comunicacion
          Serial.printf("El nodo %d esta intentando desconectarse de la red.\n", CLIENT_ID);

            //Comprobamos si el cliente esta conectado ya a la red
            if(getClientIndex(CLIENT_ID) == (char)-1){
              //El nodo no estaba en la red, no hacemos nada.
              Serial.printf("El nodo %d se ha intentado desconectarse de la red, pero no estaba en ella.\n", CLIENT_ID);
            }else{
              Serial.printf("El nodo %d se esta intentando desconectar de la red.\n", CLIENT_ID);
              //Le respondemos que su solicitud de abandonar la red ha sido procesada con exito
              deleteClient(CLIENT_ID);
              sendControlPacket(messageType::NODE_LEAVING_ACK, CLIENT_ID);
            }
          break;
        
        case messageType::INVALID : // El nodo envia INVALID, lo que quiere decir que el ultimo mensaje que enviamos estaba malformado o se corrompio por el camino, lo enviamos de nuevo.
          Serial.println("La mota ha respondido que el ultimo paquete que recibio es invalido, posible colision.");
          break;

        default: // Caso no esperado, enviamos NAK para que lo envie de nuevo (posible corrupcion?)
          Serial.printf("El router ha recibido un paquete de tipo %X, lo cual no estaba previsto.\n",incomingPackage.type);
          break;

      }

    }else{
      Serial.printf("Este router ha recibido un paquete para el router con ID: %d, descartando...\n",DESTINATION_ROUTER);
    }
  }
}

// Función de CRC-16/CCITT-FALSE (una implementación común)
uint16_t calculateChecksum(LoRaMessage msg) {

  const size_t buffSize = sizeof(msg.type) + sizeof(msg.length) + msg.length;
  uint8_t buff[buffSize];

  // Metemos todos los datos del msg lora en un buffer
  //Calculo el checksum de todos los campos menos del propio checksum, una forma seria poner el checksum al final (del struct) y excluirlo, pero el campo data es variable por lo que debe ir al final.
  memcpy(&buff, &msg.type , sizeof(msg.type));
  memcpy(&buff[sizeof(msg.type)], &msg.length , sizeof(msg.length));
  memcpy(&buff[sizeof(msg.type) + sizeof(msg.length)], &msg.data, msg.length);

  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < sizeof(buff); i++) {
    crc ^= (uint16_t)buff[i] << 8;
    for (int j = 0; j < 8; j++) {
      if (crc & 0x8000)
        crc = (crc << 1) ^ 0x1021; // Polinomio CRC-16/CCITT
      else
        crc <<= 1;
    }
  }
  return crc;
}

//Esta funcion tiene como parametro el tipo de mensaje y el ID del nodo destinatario. Envia un paquete de control del tipo seleccionado al cliente seleccionado
void sendControlPacket(messageType type, size_t clientID){

  Radio.Sleep( ); //Quitamos la radio del modo escucha

  //Formamos el paquete.
  LoRaMessage msg;
  msg.type = type;

  ControlData cdata;
  cdata.id = clientID;
  cdata.router = routerId;

  msg.length = sizeof(ControlData); //Tamaño de la carga util
  msg.data.ControlData = cdata;
  
  msg.checksum = calculateChecksum(msg);

  // Calcular el tamaño exacto del paquete.
  // No vamos a enviar el tamaño completo del struct (244B) ya que el mensaje puede que no contenga el maximo tamaño posible (controldata vs sensordata) y estariamos desperdiciando tiempo valioso de trasmision
  // En lugar de enviar paquetes estaticos de 244B enviaremos paquetes dinamicos para aprovechar mejor el tiempo de trasmision

  // Calcula el tamaño real de los datos a transmitir:
  // 1 (type) + 1 (length) + msg.length (datos reales) + 2 (checksum)

  const size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
  
  const size_t realPacketSize = headers + msg.length; //Carga util + headers

  Serial.print("Enviando paquete binario de ");
  Serial.print(realPacketSize);
  Serial.println(" bytes...");

  // --- Transmisión ---
  delay(10); //Esperamos un poco antes de enviar
  Radio.Send((uint8_t *)&msg, realPacketSize);
}

//Esta funcion tiene como parametro la configuracion de la mota. Envia el paquete de configuracion a la misma.
void sendConfigPacket(ConfData configMota){

  Radio.Sleep( ); //Quitamos la radio del modo escucha

  //Formamos el paquete.
  LoRaMessage msg;
  msg.type = messageType::DATA_CONF;

  msg.length = sizeof(ConfData); //Tamaño de la carga util
  msg.data.ConfData = configMota;
  
  msg.checksum = calculateChecksum(msg);

  // Calcular el tamaño exacto del paquete.
  // No vamos a enviar el tamaño completo del struct (244B) ya que el mensaje puede que no contenga el maximo tamaño posible (controldata vs sensordata) y estariamos desperdiciando tiempo valioso de trasmision
  // En lugar de enviar paquetes estaticos de 244B enviaremos paquetes dinamicos para aprovechar mejor el tiempo de trasmision

  // Calcula el tamaño real de los datos a transmitir:
  // 1 (type) + 1 (length) + msg.length (datos reales) + 2 (checksum)

  const size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
  
  const size_t realPacketSize = headers + msg.length; //Carga util + headers

  Serial.print("Enviando paquete de conf binario de ");
  Serial.print(realPacketSize);
  Serial.println(" bytes...");

  // --- Transmisión ---
  delay(10); //Esperamos un poco antes de enviar
  Radio.Send((uint8_t *)&msg, realPacketSize);
}

//Esta funcion se usa para enviar un BEACON_RESPONSE cuando una mota lo solicita de forma previa con un BEACON_REQUEST
//Espera un tiempo aleatorio entre 50-200ms para que todos los routers en el mismo alcance no colisionen a la vez, la probabilidad de que 2 emitan a la vez es baja.
void sendBeaconResponse(){

  Radio.Sleep( ); //Quitamos la radio del modo escucha

  delay(random(50,200)); //jitter de espera aleatoria para evitar colisiones con otros routers en el mismo alcance 

  Serial.println("Enviando Beacon Response...");

  //Formamos el paquete.
  LoRaMessage msg;
  msg.type = messageType::BEACON_RESPONSE;
  msg.length = sizeof(NetworkData); //Tamaño de la carga util
  msg.data.NetworkData = NETWORK_DATA;
  
  msg.checksum = calculateChecksum(msg);

  const size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
  
  const size_t realPacketSize = headers + msg.length; //Carga util + headers

  Serial.print("Enviando paquete binario de ");
  Serial.print(realPacketSize);
  Serial.println(" bytes...");

  Serial.printf("En la informacion de red enviada el router es publico: %d\n", msg.data.NetworkData.isPublic);

  // --- Transmisión ---
  delay(10); //Esperamos un poco antes de enviar
  Radio.Send((uint8_t *)&msg, realPacketSize);

}

char findChannelNumber(uint32_t ch){
  char result = -1; // No encontrado por defecto
  for(char i = 0; i<NUM_CHANELS; i++){
    if(ch == channelList[i]){
      result = i;
      return result;
    }
  }
  return result;
}


void initializeOled(){
  display.init();
  display.setFont(ArialMT_Plain_10);
  display.clear();
  display.drawXbm(0,5,image_width,image_height,(const unsigned char *)image_bits);
  display.display();
  delay(2500);

  //Draw progress bar 
  for(int counter=0; counter<500; counter++){
    display.clear();
    display.setTextAlignment(TEXT_ALIGN_LEFT);
    display.drawString(0, 0, String("Initializing FLoRa Router..."));

    int progress = (counter / 5) % 100;
    // draw the progress bar
    display.drawProgressBar(0, 38, 120, 10, progress);
    counter++;

    // draw the percentage as String
    display.setTextAlignment(TEXT_ALIGN_CENTER);
    display.drawString(64, 25, String(progress) + "%");
    display.display();
    delay(20);
  }
  display.setTextAlignment(TEXT_ALIGN_LEFT);

}

void initializeLora(){
  RadioEvents.TxDone = OnTxDone;
  RadioEvents.TxTimeout = OnTxTimeout;
  RadioEvents.RxDone = OnRxDone;

  Radio.Init( &RadioEvents );
  Radio.SetChannel( channel );
  Radio.SetTxConfig( MODEM_LORA, TX_OUTPUT_POWER, 0, LORA_BANDWIDTH,
                                  LORA_SPREADING_FACTOR, LORA_CODINGRATE,
                                  LORA_PREAMBLE_LENGTH, LORA_FIX_LENGTH_PAYLOAD_ON,
                                  true, 0, 0, LORA_IQ_INVERSION_ON, 3000 );

  Radio.SetRxConfig( MODEM_LORA, LORA_BANDWIDTH, LORA_SPREADING_FACTOR,
                                  LORA_CODINGRATE, 0, LORA_PREAMBLE_LENGTH,
                                  LORA_SYMBOL_TIMEOUT, LORA_FIX_LENGTH_PAYLOAD_ON,
                                  0, true, 0, 0, LORA_IQ_INVERSION_ON, true );
  Radio.Rx( 0 );
}

void TaskDisplay(void *pvParameters) {
  
  DisplayStats localStats; // Hacemos una copia local para dibujar en la pantalla sin condiciones de carrera

  for (;;) { // Bucle infinito

    //Cogemos el mutex para leer globalButtonState y modificarlo si hace falta (core 1 tambien lo puede modificar)
    
    if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
      if(globalButtonState == SHORT_PRESS){
        defaultMenu = !defaultMenu;
        globalButtonState = NO_PRESS;
      }
      xSemaphoreGive(buttonStateMutex);
    }
    
    // 1. COPIAR DATOS (SECCIÓN CRÍTICA)
    // Intentamos coger el mutex. Si el Core 1 lo tiene ocupado, esperamos máx 10ms.
    if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
        
        // Copiamos rápido las variables globales a locales
        localStats.rx_pkts = shared_rx;
        localStats.tx_pkts = shared_tx;
        localStats.rx_err = shared_rx_err;
        localStats.tx_err = shared_tx_err;
        localStats.last_client = shared_lastClient;
        localStats.last_rssi = shared_rssi;
        localStats.queueFull = shared_queueFull;
        localStats.queueSize = shared_queueSize;
        localStats.waiting_conf = shared_waiting_conf;
        
        // Soltamos el mutex
        xSemaphoreGive(statsMutex);
    }
    
    // 2. PINTAR EN PANTALLA (LENTO)
    // Esto puede tardar lo que quiera, NO bloqueará a la radio
    display.clear();
    if(defaultMenu){
      display.drawString(10, 0,  "== FLoRa Router == 1/2");
      display.drawString(0, 15, "ID: " + String(routerId) + " |" + String(SSID) + "[CH: " + String((int)numChannel) + "]"); 
      display.drawString(0, 25, "TX: " + String(localStats.tx_pkts) + " | Err: " + String(localStats.tx_err));
      display.drawString(0, 35, "RX: " + String(localStats.rx_pkts) + " | Err: " + String(localStats.rx_err));
      display.drawString(0, 45, "RSSI: " + String(localStats.last_rssi) + " | RXID: " + String(localStats.last_client));

      //Dibujar un candado cerrado si la red es privada y abierto si es publica
      if(isPublic){
        display.drawXbm(120, 17, emoji_width, emoji_height, icon_unlock);
      }else{
        display.drawXbm(120, 17, emoji_width, emoji_height, icon_lock);
      }

    }else{
      display.drawString(10, 0,  "== FLoRa Router == 2/2");
      display.drawString(0, 15, "Mote Data Q: " + String(localStats.queueSize));
      display.drawString(0, 25, "Data Ovflw : " + String(localStats.queueFull));
      display.drawString(0, 35, "Conf Pend  : " + String(localStats.waiting_conf));
    }

    // Barra de vida o animación para saber que no está colgado
    display.drawString(120, 45, (millis() / 1000) % 2 == 0 ? "." : "..");
    
    display.display();

    // 3. DORMIR TAREA
    // Actualizamos la pantalla 1 veces por segundo (cada 700ms)
    // vTaskDelay es vital para no saturar el Core 0 y que el Watchdog no salte
    vTaskDelay(700 / portTICK_PERIOD_MS); 
  }
}

//--------------------------------------------------Clients Managment--------------------------------------------------

//Devuelve la posicion del cliente en la lista ( >= 0 ) si estaba presente, -1 en caso contrario
char getClientIndex(const size_t client){

  for(uint8_t c = 0 ; c < activeClients; c++ ){ //Para que no de muchas vueltas, en vez de poner MAX_CLIENT podemos poner el numero de clientes activos, pero debemos tener el buffer siempre compacto
    if(connectedClients[c] == client){                //Ver la funcion de eliminacion de clientes
      return c;
    }
  }
  return -1;
}

void addClient(const size_t client){
  connectedClients[activeClients] = client;
  activeClients++;
}

//Elimina un cliente. Coje al ultimo cliente de la lista y lo pone en la posicion del cliente que se va a eliminar, para tener siempre el array compacto.
bool deleteClient(const size_t client){

  char pos = getClientIndex(client);
  if(pos >= 0){
    connectedClients[pos] = connectedClients[activeClients - 1];
    connectedClients[activeClients - 1] = 0;
    activeClients--;
    return true;
  }
  return false;
}

//------------------------------------------------Debug functions--------------------------------------------------------

void packageToSerial(LoRaMessage pkg, uint16_t size, int16_t rssi, int8_t snr){

  Serial.println("\n--- PAQUETE LORA RECIBIDO ---");

  Serial.printf("Tamaño total del paquete recibido: %d Bytes\n",size);

  // 1. Imprimir el Tipo de Mensaje (Type)

  Serial.print("1. Tipo (Enum): ");

  Serial.println((uint8_t)pkg.type, HEX);


  // 2. Imprimir la Longitud de los Datos (Length)

  Serial.print("2. Longitud de datos (Bytes): ");

  Serial.println(pkg.length);

  // 3. Imprimir los Datos (Payload) 

  Serial.print("3. Datos (Payload): ");

  if(pkg.type == messageType::DATA){
    
    Serial.printf("Router: %d | ID: %d | Humidity: %d | Battery: %d | GPS: LAT -> %.5f  -- LONG -> %.5f\n", pkg.data.SensorsData.router, pkg.data.SensorsData.id,
    pkg.data.SensorsData.humidity, pkg.data.SensorsData.battery, pkg.data.SensorsData.latitude, pkg.data.SensorsData.longitude);

  }else if(pkg.type == messageType::BEACON_REQUEST){

    Serial.println("Se ha recibido un BEACON REQUEST.");

  }else{ // Packetes de control

    Serial.printf("Router: %d | ID: %d \n", pkg.data.ControlData.router, pkg.data.ControlData.id);

  }
  // 4. Imprimir el Checksum (sin verificación por ahora)

  Serial.print("4. Checksum (Recibido): 0x");

  Serial.println(pkg.checksum, HEX);

  // 5. Imprimir el RSSI

  Serial.print("5. RSSI: ");

  Serial.println(rssi);

  // 6. SNR
  Serial.printf("6. SNR: %d\n", snr);
}


void checkButton() {
  // Leemos el botón (recordamos que LOW es pulsado en Heltec V3)
  bool currentState = (digitalRead(BUTTON_PIN) == LOW);

  // 1. FLANCO DE BAJADA (Detectar inicio de pulsación)
  if (currentState && !isPressing) {
    isPressing = true;
    pressStartTime = millis();
  }

  // 2. FLANCO DE SUBIDA (Detectar que se ha soltado)
  if (!currentState && isPressing) {
    isPressing = false;
    
    // Calculamos cuánto duró la pulsación
    unsigned long duration = millis() - pressStartTime;

    // 3. CLASIFICACIÓN DEL EVENTO
    if (duration < DEBOUNCE_MS) {
      //Cogemos el mutex para leer globalButtonState y modificarlo si hace falta (TaskDisplay tambien lo puede modificar)
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        // Fue ruido, no hacemos nada
        globalButtonState = NO_PRESS; 
        xSemaphoreGive(buttonStateMutex);
      }
      
    } 
    else if (duration < LONG_PRESS_MS) {
      //Cogemos el mutex para leer globalButtonState y modificarlo si hace falta (TaskDisplay tambien lo puede modificar)
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        globalButtonState = SHORT_PRESS; 
        xSemaphoreGive(buttonStateMutex);
      }
    } 
    else {
      //Cogemos el mutex para leer globalButtonState y modificarlo si hace falta (TaskDisplay tambien lo puede modificar)
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        globalButtonState = LONG_PRESS; 
        xSemaphoreGive(buttonStateMutex);
      }
    }
  }
}

void parseBigPacketResponse(String response){

  JsonDocument doc; // Json dinamico , version 7
  DeserializationError error = deserializeJson(doc, response);

  if (error) {
    Serial.print("Error al parsear el big-packet: ");
    Serial.println(error.c_str());
    return;
  }

  JsonArray confArray = doc["conf"];

  for (JsonObject item : confArray) {
    // Seguridad básica
    if (!item.containsKey("tg") || !item.containsKey("id")) continue; 

    const char* tag = item["tg"];
    
    if (strcmp(tag, "r") == 0) { //Aplicamos la configuracion del router

      if((size_t)item["id"] == routerId){ //Comprobamos que este router sea el target 
        
        uint16_t versionDeseada = (uint16_t)item["v"];

        if (item.containsKey("p")) { //Parametros de configuracion

          numChannel = item["p"]["c"] | numChannel;
          channel = channelList[numChannel];
          isPublic = item["p"]["eP"] | isPublic;

          if(item["p"].containsKey("s")){
            // Usar strncpy es más seguro que mempcpy para cadenas de texto
            strncpy(SSID, item["p"]["s"], SSID_LENGTH - 1);
            SSID[SSID_LENGTH - 1] = '\0'; // Asegurar el terminador nulo
          }

          //Actualizamos NETWORK_DATA usado en los beacon frames
          strncpy(NETWORK_DATA.SSID, SSID, SSID_LENGTH);
          NETWORK_DATA.isPublic = isPublic;
        }

        Radio.SetChannel( channel );
        version = versionDeseada; //Una vez aplicamos los cambios actualizamos la version
        Serial.println("Configuracion de Router actualizada.");
      }

    }
    else if (strcmp(tag, "m") == 0) { // Aplicamos la configuración para motas
      
      size_t targetMoteId = item["id"];
      int index = -1;

      // 1. Buscamos si la mota ya tiene una configuración en la cola
      for (size_t i = 0; i < motasConf.size(); i++) {
        if (motasConf[i].id == targetMoteId) {
          index = i;
          break;
        }
      }

      // 2. Si la mota NO existe en nuestra lista
      if (index == -1) {
        
        // Comprobamos el límite de MAX_CLIENTS
        if (motasConf.size() >= MAX_CLIENTS) {
          Serial.printf("Aviso: No se pueden guardar más configs (Max %d alcanzado).\n", MAX_CLIENTS);
          continue; // Pasamos a la siguiente iteración del for
        }

        ConfData nuevaConf;
        nuevaConf.router = routerId; // Siempre asignamos el ID de este router
        nuevaConf.id = targetMoteId;
        nuevaConf.version = item["v"];

        nuevaConf.sendInterval = 0; // 0 significará "Mantener actual", no tiene sentido un sendInterval de 0 minutos
        nuevaConf.allowPublicConn = -1; // La mota mantiene su configuracion por defecto
        
        if (item.containsKey("p")) {
          if (item["p"].containsKey("f")) {
            nuevaConf.sendInterval = item["p"]["f"];
          }
          if (item["p"].containsKey("cP")) {
            nuevaConf.allowPublicConn = item["p"]["cP"];
          }
        }

        motasConf.push_back(nuevaConf);

      } 
      // 3. Si la mota YA existe, actualizamos SOLO los valores que vengan en el JSON
      else {
        
        if (item.containsKey("v")) {
          motasConf[index].version = item["v"];
        }

        if (item.containsKey("p")) {
          // Comprobamos explícitamente cada campo para no sobreescribir con 0/false si falta
          if (item["p"].containsKey("f")) {
            motasConf[index].sendInterval = item["p"]["f"];
          }
          if (item["p"].containsKey("cP")) {
            motasConf[index].allowPublicConn = item["p"]["cP"];
          }
        }
      }
    }
  }
  if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
    shared_waiting_conf = motasConf.size();
    xSemaphoreGive(statsMutex);
  }
}

//Funcion para buscar la configuracion de una mota, devuelve su configuracion pendiente o una configuracion con id = 0 en caso contrario 
ConfData searchMotaConf(size_t id) {
  for (size_t i = 0; i < motasConf.size(); i++) {
    if (motasConf[i].id == id) {
      return motasConf[i];
    }
  }

  // Si no se encuentra:
  ConfData notFound;
  notFound.id = 0; 
  return notFound;
}