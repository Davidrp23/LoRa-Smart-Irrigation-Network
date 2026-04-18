#pragma once
#include <Arduino.h>
#include "LoRaWan_APP.h"
#include "types.h"
#include "config.h"
#include "network.h"
#include "display.h"

// Lora chip events functions
void initializeLora();
void OnTxDone( void );
void OnTxTimeout( void );
void OnRxDone( uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr );

// Protocol functions
void process(LoRaMessage incomingPackage);
uint16_t calculateChecksum(LoRaMessage msg);
void sendControlPacket(messageType type, size_t clientID);
void sendConfigPacket(ConfData configMota);
void sendBeaconResponse();
bool IsChannelFree();
char findChannelNumber(uint32_t ch);

// Debug
void packageToSerial(LoRaMessage pkg, uint16_t size, int16_t rssi, int8_t snr);
