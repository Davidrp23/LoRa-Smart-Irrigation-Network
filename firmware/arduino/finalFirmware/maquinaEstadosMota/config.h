#pragma once
#include <Arduino.h>

//----------------------------------LORA PARAMETERS--------------------------------
#define NUM_CHANELS 4

#define CHANEL_0 868100000
#define CHANEL_1 868300000
#define CHANEL_2 868500000
#define CHANEL_3 869525000

#define TX_OUTPUT_POWER 14       // dBm
#define LORA_BANDWIDTH 0         // [0: 125 kHz]
#define LORA_SPREADING_FACTOR 7  // [SF7]
#define LORA_CODINGRATE 1        // [1: 4/5]
#define LORA_PREAMBLE_LENGTH 8
#define LORA_SYMBOL_TIMEOUT 0
#define LORA_FIX_LENGTH_PAYLOAD_ON false
#define LORA_IQ_INVERSION_ON false
#define RX_TIMEOUT_VALUE 3000  // Aumentado a 3000 para dar margen
#define RX_PRIVATE_NW_JOIN_TIMEOUT_VALUE 180000  // 3 minutos de timeout
#define RSSI_THRESHOLD -80  // RSSI maximo para trasmitir

// --- CONSTANTES DE TIEMPO ---
#define BUTTON_PIN 4        // Botón externo
#define DEBOUNCE_MS 50      // Filtro para rebotes
#define LONG_PRESS_MS 1000  // Tiempo para considerar pulsación larga (1s)

#define SCAN_TIME 30000  //Durante este tiempo (en ms) la mota estara mandando beacon_request

//ID de la mota (Constante global)
const size_t MY_NODE_ID = 1;

extern const uint32_t channelList[NUM_CHANELS];
