#include "Arduino.h"

//Libraries for LoRa
#include "LoRaWan_APP.h"


//Libraries for OLED Display
#include <Wire.h>               
#include "HT_SSD1306Wire.h"

//Icons
#include "images.h"


//----------------------------------LORA_PARAMETERS----------------------------------
#define RF_FREQUENCY                                868100000 // Hz

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

//Operating Router Params
#define MAX_CLIENTS 30
#define SSID_LENGTH 12 + 1 // +1 para el terminador nulo


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


}NetworkData;

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene los ID del router y mota que se estan comunicando, estos campos se usan para evitar que otras motas/router procesen un paquete que no van para ellos.

  size_t router; //ID Router que manda el paquete, siempre > 0 

  size_t id; // ID mota a la que va destinada la configuracion, siempre > 0

  size_t sendInterval; // Periodo en segundos que la mota tarda en enviar informacion

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

//Params displayed on the OLED screen
int lastOledUpdate = 0;
int receivedPackages = 0;
int sentPackcages = 0;
int sentErroredPackages = 0;
int receivedErroredPackages = 0;

size_t connectedClients[MAX_CLIENTS];

uint8_t activeClients = 0;

const size_t routerId = 1; // Los id son siempre > 0
const char SSID[SSID_LENGTH] = "Parcela00001";
NetworkData NETWORK_DATA;

// Lista de canales seguros (en Hz)
// Separación de 200kHz para evitar solapamiento de señal de 125kHz
// const uint32_t channelList[] = {
//     868100000, // Canal 1 (Estándar)
//     868300000, // Canal 2 (Estándar)
//     868500000, // Canal 3 (Estándar)
//     869525000  // Canal 4 (Alta potencia / Reserva)
// };

// const uint8_t totalChannels = 4;

//----------------------------------------------------------------------------------------------------------------------------------------


void setup() {

  Mcu.begin(HELTEC_BOARD,SLOW_CLK_TPYE);

  VextON();
  
  //initialize Serial Monitor
  Serial.begin(115200);
  
  Serial.println("Iniciando Router");

  initializeLora();
  
  initializeOled();

  NETWORK_DATA.router = routerId;
  mempcpy(&NETWORK_DATA.SSID, SSID, SSID_LENGTH);

}


void loop() {

  // put your main code here, to run repeatedly:
  Radio.IrqProcess( );

  if( (millis() - lastOledUpdate) > 1000 ){
    updateDisplayStatistics();
    lastOledUpdate = millis();
  }
  
}

void OnTxDone( void ){

  Serial.print("TX done......");
  sentPackcages++;
  updateDisplayStatistics();
  Radio.Rx( 0 );
}

void OnTxTimeout( void )
{
  Serial.print("TX Timeout......");
  sentErroredPackages++;
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

        receivedPackages++;

        //Debug
        packageToSerial(incomingMessage, size, rssi, snr);

        process(incomingMessage);

      }else{

        // checksum invalido, hay datos corruptos
        receivedErroredPackages++;
        Serial.print("Error de checksum, checksum del mensaje: ");
        Serial.print(incomingMessage.checksum);
        Serial.print(", checksum calculado: ");
        Serial.println(expectedChecksum);

      }

    } else {
      // El campo 'length' indica X, pero el paquete recibido era Y. Error de protocolo.
      receivedErroredPackages++;
      Serial.print("Error de longitud en el protocolo! Paquete real: ");
      Serial.print(size);
      Serial.print(", Esperado por Header: ");
      Serial.println(expectedSize);
    }
    
  } else if (size > 0) {
    // Paquete demasiado pequeño para siquiera contener los headers (corrupto)
    receivedErroredPackages++;
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

    if(DESTINATION_ROUTER == routerId){

      Serial.println("Se ha recibido un paquete con destino este router.");
      
      switch(incomingPackage.type){

        //Para no formar bucles infinitos, el nodo y el router tendran 3 ciclos para completar la comunicacion, en caso de 3 fallos reiterados se cancelara la comunicacion

        case messageType::DATA : // El nodo adjunta datos recolectado por sus sensores
          Serial.println("Se ha recibido un paquete de datos de una mota, encendiendo AM-036 para enviar los datos al servidor de FLoRa...");
          sendControlPacket(messageType::DATA_ACK, CLIENT_ID);
          break;

        case messageType::JOIN_REQUEST : // El nodo solicita unirse a la red gestionada por este router, aceptamos o denegamos empleando las cabeceras adecuadas

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

//Esta funcion se usa para enviar un BEACON_RESPONSE cuando una mota lo solicita de forma previa con un BEACON_REQUEST
void sendBeaconResponse(){

  Radio.Sleep( ); //Quitamos la radio del modo escucha

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

  // --- Transmisión ---
  delay(10); //Esperamos un poco antes de enviar
  Radio.Send((uint8_t *)&msg, realPacketSize);

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
  Radio.SetChannel( RF_FREQUENCY );
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

void updateDisplayStatistics(){

  display.clear();
  display.drawString(0, 0, String("--Estadistica de paquetes:--"));
  display.drawString(0, 15, String("Paquetes Enviados: ") + String(sentPackcages));
  display.drawString(0, 25, String("Enviados Erroneos: ") + String(sentErroredPackages));
  display.drawString(0, 35, String("Paquetes Recibidos: ") + String(receivedPackages));
  display.drawString(0, 45, String("Recibidos Erroneos: ") + String(receivedErroredPackages));
  display.display();  
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
//------------------------------------------------------------------------------------------------------------------------

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

