//AMcontrol.h

#pragma once
#include <Arduino.h>
#include "display.h"
#include "network.h"

#include "config.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "SerialAM_lib.h"

#define AM_RX_PIN 41      // RX del Heltec --> TX del AM-036
#define AM_TX_PIN 42      // TX del Heltec --> RX del AM-036
#define AM_MOSFET_PIN 3   // Pin que controla el Gate del IRLML6344 para el AM-036

#define TWO_MINUTES_MILLIS 120000
#define TEN_MINUTES_MILLIS 600000
#define THIRTY_MINUTES_MILLIS 1800000
#define ONE_HOUR_MILLIS 3600000
#define TWELVE_HOURS_MILLIS 43200000

TickType_t first_packet_timestamp = 0; // timestamp del primer paquete de la cola
TickType_t last_dataSend_timestamp = 0; // timestamp del ultimo envio al servidor
TickType_t last_execution_uplink_manager_task = 0; //timestamp de la ultima ejecucion de la tarea

bool canSend = false;
bool received = false;

String respuestaStr;

//Instanciamos el objeto usando Serial1 (Hardware UART)
SerialAM am036(Serial1, MOSFET_PIN);

void AMConf();

