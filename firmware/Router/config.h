#pragma once
#include <Arduino.h>

// -- AM-036 --
#define MAX_MOTAS_EN_COLA 40 // Numero maximo de datos para las motas en cola
#define MAX_CLIENTS 30

// -- GPS del router (mismo módulo que las motas, mismo UART)
#define GPS_MOSFET_PIN  48
#define GPS_RX_PIN       6   // ESP32 RX ← GPS TX
#define GPS_TX_PIN       7   // ESP32 TX → GPS RX<
#define GPS_BAUD      9600
#define GPS_TIMEOUT  180000  // 3 minutos máx. de búsqueda de fix

// -- Fuel Gauge MAX17043 (I2C secundario del Heltec router)
#define FUEL_SDA_PIN    33
#define FUEL_SCL_PIN    26
//----------------------------------LORA_PARAMETERS----------------------------------
#define NUM_CHANELS 4

#define CHANEL_0 868100000
#define CHANEL_1 868300000
#define CHANEL_2 868500000
#define CHANEL_3 869525000

#define TX_OUTPUT_POWER 5       // dBm
#define LORA_BANDWIDTH 0        // [0: 125 kHz]
#define LORA_SPREADING_FACTOR 7 // [SF7..SF12]
#define LORA_CODINGRATE 1       // [1: 4/5]
#define LORA_PREAMBLE_LENGTH 8  // Same for Tx and Rx
#define LORA_SYMBOL_TIMEOUT 0   // Symbols
#define LORA_FIX_LENGTH_PAYLOAD_ON false
#define LORA_IQ_INVERSION_ON false

#define RX_TIMEOUT_VALUE 1000
#define RSSI_THRESHOLD                                                         \
  -80 // RSSI maximo para trasmitir, un valor mayor se considera que el canal
      // esta ocupado o hay demasiado ruido ambiente

// --- CONSTANTES DE TIEMPO ---
#define BUTTON_PIN 3       // Botón externo
#define DEBOUNCE_MS 50     // Filtro para rebotes
#define LONG_PRESS_MS 1000 // Tiempo para considerar pulsación larga (1s)

// --- TAMAÑOS ---
#define MAX_PAYLOAD_SIZE 70 // Max size for the Data field
#define SSID_LENGTH 8 + 1   // +1 para el terminador nulo

// --- VARIABLES EXTERNAS ---
extern const size_t routerId;
extern char SSID[];
extern bool isPublic;
extern size_t channel;
extern int8_t numChannel;
extern uint16_t version; // Variable compartida !! protegida por statsMutex!!

extern const uint32_t channelList[NUM_CHANELS];
