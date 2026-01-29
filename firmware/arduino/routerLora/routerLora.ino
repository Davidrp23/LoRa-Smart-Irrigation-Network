#include "Arduino.h"

//Libraries for LoRa
#include "LoRaWan_APP.h"


//Libraries for OLED Display
#include <Wire.h>               
#include "HT_SSD1306Wire.h"


//----------------------------------LORA_PARAMETERS----------------------------------
#define RF_FREQUENCY                                865000000 // Hz

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

//-------------------------------------------------------------------------------------- 

//Params displayed on the OLED screen
double receivedPackages = 0;
double sentPackcages = 0;
double sentErroredPackages = 0;
double receivedErroredPackages = 0;


enum class messageType : uint8_t {
    // Mensajes de Control de Canal
    RTS = 0x10,      // Request To Send (Solicitud para enviar)
    CTS = 0x11,      // Clear To Send (Permiso para enviar)
    
    // Mensajes de Datos
    DATA = 0x20,     // Paquete que contiene la carga útil de datos
    DATA_ACK = 0x21, // Acknowledge (Confirmación) de recepción de DATA
    
    // Mensajes de Mantenimiento / Finalización
    FIN = 0x31,      // Finalizar la transmisión

    // --- Solicitud y Descubrimiento ---
    JOIN_REQUEST = 0x50,      // Solicitud de un nuevo nodo para unirse a la red.

    // --- Respuesta del Coordinador (Admision) / Gateway ---
    JOIN_ACCEPTED = 0x55,     // Respuesta del coordinador que acepta la solicitud. 
                              // Debe incluir información de configuración (ej. ID de red, clave).
    JOIN_DENIED = 0x56,       // Respuesta del coordinador que deniega la solicitud de unión.
    
    // --- Bloqueo y Mantenimiento ---
    NODE_BLOCKED = 0x60,      // Mensaje del coordinador para informar a un nodo que está bloqueado.
    NODE_LEAVING = 0x61,      // Mensaje de un nodo que desea salir de la red de forma controlada.

    INVALID = 0x00  // Default o desconocido
    
};

typedef struct __attribute__((packed)) {

    size_t router; //Router al que va destinado el paquete

    size_t id; // ID desde el que proviene el paquete

}ControlData;

typedef struct __attribute__((packed)) {

  size_t router; //Router al que va destinado el paquete

  size_t id; // ID desde el que proviene el paquete

  char GPS[40];

  uint8_t humidity;

  uint8_t battery;
  
}SensorsData;

// Se usa __attribute__((packed)) para asegurar que el compilador no añada relleno (padding)
// entre los campos, garantizando que el struct tenga exactamente el tamaño esperado.
typedef struct __attribute__((packed)) {
    // 1. Tipo de Mensaje (1 Byte)
    messageType type; 
    
    // 2. Longitud de los datos (1 Byte) - Es vital para saber cuántos bytes son DATA real.
    uint8_t length; 
    
    // 3. Carga Útil (Máximo 240 Bytes)
    union {
        uint8_t raw[MAX_PAYLOAD_SIZE];
        ControlData ControlData;
        SensorsData SensorsData;
    } data;
    
    // 4. Checksum (2 Bytes)
    uint16_t checksum; 
} LoRaMessage;


static SSD1306Wire  display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED); // addr , freq , i2c group , resolution , rst


void setup() {

  Mcu.begin(HELTEC_BOARD,SLOW_CLK_TPYE);

  initializeOled();
  
  //initialize Serial Monitor
  Serial.begin(115200);
  
  Serial.println("Iniciando Router");

  initializeLora();
  
}




void loop() {
  // put your main code here, to run repeatedly:
  Radio.IrqProcess( );
  updateDisplayStatistics();
}

void OnTxDone( void ){

  Serial.print("TX done......");
  sentPackcages++;
  updateDisplayStatistics();
  Radio.Rx( 0 );
}

void OnTxTimeout( void )
{
  Radio.Sleep( );
  Serial.print("TX Timeout......");
  sentErroredPackages++;
  //Volver a intentar enviarlo nuevamente
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
        
      receivedPackages++;

      Serial.println("\n--- PAQUETE LORA RECIBIDO ---");

      // 1. Imprimir el Tipo de Mensaje (Type)

      Serial.print("1. Tipo (Enum): ");

      Serial.println((uint8_t)incomingMessage.type, HEX);


      // 2. Imprimir la Longitud de los Datos (Length)

      Serial.print("2. Longitud de datos (Bytes): ");

      Serial.println(incomingMessage.length);


      // 3. Imprimir los Datos (Payload)

      Serial.print("3. Datos (Payload): ");

      // Usamos LoRaData para mostrar el mensaje en el Serial y Display

      char payloadBuffer[MAX_PAYLOAD_SIZE + 1]; // +1 para el terminador nulo


      // Copiamos los datos del array interno de la estructura al buffer local

      // y nos aseguramos de no leer más de lo que la longitud indica.

      size_t actualLength = std::min((size_t)incomingMessage.length, (size_t)MAX_PAYLOAD_SIZE);

      memcpy(payloadBuffer, incomingMessage.data.raw, actualLength);

      payloadBuffer[actualLength] = '\0'; // Asegurar terminador nulo


      String receivedData = String(payloadBuffer);

      Serial.println(receivedData);


      // 4. Imprimir el Checksum (sin verificación por ahora)

      Serial.print("4. Checksum (Recibido): 0x");

      Serial.println(incomingMessage.checksum, HEX);

      // 5. Imprimir el RSSI

      Serial.print("RSSI: ");

      Serial.println(rssi);



      Serial.println("-----------------------------");    
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

  Radio.Sleep( );
  delay(30);
  Radio.Rx( 0 );
}

void process(LoRaMessage incomingPackage){

  switch(incomingPackage.type){

    //Para no formar bucles infinitos, el nodo y el router tendran 3 ciclos para completar la comunicacion, en caso de 3 fallos reiterados se cancelara la comunicacion

    case messageType::RTS : // El nodo solicita permiso para enviar, se le envia CTS si el canal esta libre o nada si esta ocupado 
      break;

    case messageType::DATA : // El nodo adjunta datos recolectado por sus sensores
      break;

    case messageType::FIN : // El nodo termina la comunicacion 
      break;

    case messageType::JOIN_REQUEST : // El nodo solicita unirse a la red gestionada por este router, aceptamos o denegamos empleando las cabeceras adecuadas
      break;

    case messageType::INVALID : // El nodo envia INVALID, lo que quiere decir que el ultimo mensaje que enviamos estaba malformado o se corrompio por el camino, lo enviamos de nuevo.
      break;

    case messageType::NODE_LEAVING : //El nodo solicita salirse de la Red que gestiona este router, el router envia messageType::FIN para aceptar la salida del nodo y terminar la comunicacion
      break;

    default: // Caso no esperado, enviamos NAK para que lo envie de nuevo (posible corrupcion?)
      break;

  }

}

// Función de CRC-16/CCITT-FALSE (una implementación común)
uint16_t calculateChecksum(const uint8_t* buf, size_t len) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < len; i++) {
    crc ^= (uint16_t)buf[i] << 8;
    for (int j = 0; j < 8; j++) {
      if (crc & 0x8000)
        crc = (crc << 1) ^ 0x1021; // Polinomio CRC-16/CCITT
      else
        crc <<= 1;
    }
  }
  return crc;
}

void sendPacket(LoRaMessage msg){
  // 1. Calcular el tamaño exacto del paquete.
  // No vamos a enviar el tamaño completo del struct (244B) ya que el mensaje puede que no contenga el tamaño completo del buffer y estariamos desperdiciando tiempo valioso de trasmision
  // En lugar de enviar paquetes estaticos de 244B enviaremos paquetes dinamicos para aprovechar mejor el tiempo de trasmision

  // Calcula el tamaño real de los datos a transmitir:
  // 1 (type) + 1 (length) + msg.length (datos reales) + 2 (checksum)

  size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
  
  size_t realPacketSize = headers + msg.length;

  Serial.print("Enviando paquete binario de ");
  Serial.print(realPacketSize);
  Serial.println(" bytes...");
  
  // --- Transmisión ---
  Radio.Send((uint8_t *)&msg, realPacketSize);
}

void initializeOled(){
  display.init();
  display.setFont(ArialMT_Plain_10);
  display.clear();
  display.drawString(0, 0, String("Starting..."));
  display.display();
  delay(1000);
  display.clear();

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
  display.drawString(0, 0, String("---Estadistica de paquetes:---"));
  display.drawString(0, 20, String("Paquetes Enviados: ") + String(sentPackcages));
  display.drawString(0, 40, String("Enviados Erroneos: ") + String(sentErroredPackages));
  display.drawString(0, 50, String("Paquetes Recibidos: ") + String(receivedPackages));
  display.drawString(0, 60, String("Recibidos Erroneos: ") + String(receivedErroredPackages));
  display.display();  
}
