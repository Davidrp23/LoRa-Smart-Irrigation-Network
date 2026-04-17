#pragma once
#include <Arduino.h>
#include "LoRaWan_APP.h"
#include <vector>
#include "types.h"
#include "config.h"
#include "storage.h"

// Variables from main
extern MotaState currentState;
extern unsigned long stateStartTime;
extern unsigned long lastSleepTime;
extern unsigned long startScan;
extern uint8_t scaningChanel;
extern std::vector<ScannedNetwork> foundNetworks;
extern bool needDisplayUpdate;

void initializeLora();
void sendBeaconRequest();
void sendJoinRequest();
void sendNodeLeaving();
void sendSensorData(uint8_t humPercentage, uint8_t batPercentage, float lat, float lon);
void sendDataConfACK();
bool IsChannelFree();
void watchdogRX();
