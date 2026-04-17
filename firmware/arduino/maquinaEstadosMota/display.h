#pragma once
#include <Arduino.h>
#include <vector>
#include "types.h"
#include "config.h"
#include "storage.h"
#include "sensors.h"
#include "Battery.h"
#include "lora_node.h"

extern uint8_t defaultMenu;
extern bool needDisplayUpdate;
extern volatile ButtonEvent globalButtonState;

extern int selectedNetworkIndex;
extern unsigned long startLeavingState;

extern bool isOledInitialized;
extern unsigned long lastButtonActivity;

void initializeOled(bool showAnimation = true);
void updateOled(humData &myHumData, GpsData &myGpsData, batteryStatus &senderBattery);
void handleNetworkSelectionMenu();
void checkButton();
