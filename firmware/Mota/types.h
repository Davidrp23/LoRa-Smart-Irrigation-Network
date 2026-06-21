#pragma once
#include <Arduino.h>

#define SSID_LENGTH 8 + 1  // +1 para el terminador nulo
#define MAX_PAYLOAD_SIZE 70

enum class messageType : uint8_t {
  BEACON_REQUEST = 0x00,
  BEACON_RESPONSE = 0x01,
  JOIN_REQUEST = 0x02,
  JOIN_ACCEPTED = 0x03,
  JOIN_DENIED = 0x04,
  NODE_BLOCKED = 0x05,
  NODE_LEAVING = 0x06,
  NODE_LEAVING_ACK = 0x07,
  DATA = 0x20,
  DATA_CONF = 0x21,
  DATA_CONF_ACK = 0x22,
  DATA_ACK = 0x23,
  CRYPTO_ERROR = 0x24,
  INVALID = 0xFF
};

typedef struct __attribute__((packed)) {
  size_t router;
  size_t id;
} ControlData;

typedef struct __attribute__((packed)) {
  size_t router;
  char SSID[SSID_LENGTH];
  bool isPublic;
} NetworkData;

struct ScannedNetwork {
  NetworkData info;
  int16_t rssi;
  uint8_t channel;
  bool connected;
};

typedef struct __attribute__((packed)) {
  size_t router;
  size_t id;
  size_t sendInterval;
  int8_t allowPublicConn;
  uint16_t version;
} ConfData;

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

typedef struct __attribute__((packed)) {
  messageType type;
  uint8_t length;
  uint32_t fcnt;
  uint16_t checksum;
  union {
    uint8_t raw[MAX_PAYLOAD_SIZE];
    NetworkData NetworkData;
    ControlData ControlData;
    ConfData ConfData;
    SensorsData SensorsData;
  } data;
} LoRaMessage;

enum MotaState {
  STATE_INIT,
  STATE_START_SCAN,
  STATE_TX_SCAN,
  STATE_RX_SCAN,
  STATE_WAIT_USER_SELECTION,
  STATE_START_JOIN,
  STATE_TX_JOIN,
  STATE_RX_JOIN,
  STATE_START_DATA,
  STATE_TX_DATA,
  STATE_RX_DATA,
  STATE_SLEEP,
  STATE_LEAVING_NETWORK
};

enum ButtonEvent {
  NO_PRESS,
  SHORT_PRESS,
  LONG_PRESS
};
