#pragma once
#include <Arduino.h>
#include <cstdint>
#include <cstddef>
#include "config.h"

// --- ESTADOS DEL BOTÓN (Variable Global) ---
// Usamos un enum para que sea legible en cualquier parte del código
enum ButtonEvent {
  NO_PRESS,     // Nada ha pasado
  SHORT_PRESS,  // Pulsación corta detectada
  LONG_PRESS    // Pulsación larga detectada
};

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
    
    CRYPTO_ERROR = 0x24,

    INVALID = 0xFF  // Default o desconocido
    
};

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene los ID del router y mota que se estan comunicando, estos campos se usan para evitar que otras motas/router procesen un paquete que no van para ellos.

  size_t router; //Router al que va destinado el paquete, siempre > 0 

  size_t id; // ID desde el que proviene el paquete, siempre > 0

}ControlData;

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene el ID del router que manda el beacon frame, asi কাশীomo el SSID de la red 

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

  size_t router;  //Router al que va destinado el paquete, siempre > 0

  size_t id;  // ID desde el que proviene el paquete, siempre > 0

  uint8_t humidity;

  uint8_t battery;

  float latitude;  // Mejor mandar las coordenadas como 2 float (4B cada uno) que como un array de caracteres (Ahorramos espacio).

  float longitude;

  uint16_t version;  // Version de la configuracion de la mota

  //Telemetria:
  uint16_t receivedPackets;
  uint16_t sendedPackets;
  int16_t lastRssi;
  int8_t lastSnr;
  uint16_t rx_err;
  uint16_t tx_err;
  uint16_t channelBusyErrors;
  uint16_t missingAckErrors;
  uint16_t crypto_err;
  uint16_t crc_err;

} SensorsData;

// Se usa __attribute__((packed)) para asegurar que el compilador no añada relleno (padding)
// entre los campos, garantizando que el struct tenga exactamente el tamaño esperado.
typedef struct __attribute__((packed)) {
    // 1. Tipo de Mensaje (1 Byte)
    messageType type; 
    
    // 2. Longitud de los datos (1 Byte) - Es vital para saber cuántos bytes son DATA real.
    uint8_t length;

    // 3. Frame counter (4 Bytes) - Cifrado e integridad global (anti-replay)
    uint32_t fcnt;

    // 4. Checksum (2 Bytes)
    uint16_t checksum;  
    
    // 4. Carga Útil (Máximo 50 Bytes)
    union {
      uint8_t raw[MAX_PAYLOAD_SIZE];
      NetworkData NetworkData;
      ControlData ControlData;
      ConfData ConfData;
      SensorsData SensorsData;
    } data;
    
} LoRaMessage;

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
  uint16_t channelBusyErrors;
  int8_t connectedClients;
  size_t crc_err;
  size_t crypto_err;
  uint16_t version;
  int8_t coverage;
};

// Estructura que viaja por la rxQueue desde el callback OnRxDone hasta
// la tarea loraRxProcessTask. Guarda una copia del payload crudo para
// no depender del buffer efímero que provee el driver LoRa.
typedef struct __attribute__((packed)) {
  uint8_t  raw[MAX_PAYLOAD_SIZE + 8]; // +8 = margen para los headers del LoRaMessage
  uint16_t size;                      // Tamaño real del paquete recibido (bytes)
  int16_t  rssi;                      // RSSI del paquete
  int8_t   snr;                       // SNR del paquete
} RxRawPacket;
