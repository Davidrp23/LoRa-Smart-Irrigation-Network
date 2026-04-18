#pragma once
#include <Arduino.h>
#include "types.h"
#include "config.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

// Candado para proteger las variables compartidas
extern SemaphoreHandle_t statsMutex; 
extern SemaphoreHandle_t buttonStateMutex; 

// Variables globales protegidas
extern volatile size_t shared_rx;
extern volatile size_t shared_tx;
extern volatile size_t shared_rx_err;
extern volatile size_t shared_tx_err;
extern volatile int16_t shared_rssi;
extern volatile size_t shared_queueFull;
extern volatile uint8_t shared_queueSize;
extern volatile uint8_t shared_waiting_conf;
extern volatile uint16_t shared_channelBusyErrors;
extern volatile int8_t shared_connectedClients;
extern size_t shared_lastClient;

// OLED UI 
extern uint8_t defaultMenu;

// Button
extern volatile ButtonEvent globalButtonState;

// Funciones
void initializeOled();
void TaskDisplay(void *pvParameters);
void checkButton();
