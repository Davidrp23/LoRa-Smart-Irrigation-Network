#pragma once
#include <Arduino.h>
#include <Preferences.h>
#include "types.h"
#include "sensors.h"

// Variables en RTC_DATA_ATTR
extern RTC_DATA_ATTR uint16_t receivedPackets;
extern RTC_DATA_ATTR uint16_t sendedPackets;
extern RTC_DATA_ATTR int16_t lastRssi;
extern RTC_DATA_ATTR uint16_t rx_err;
extern RTC_DATA_ATTR uint16_t tx_err;
extern RTC_DATA_ATTR uint16_t channelBusyErrors;
extern RTC_DATA_ATTR uint16_t missingAckErrors;

extern RTC_DATA_ATTR int8_t changeRouterAttempts;
extern RTC_DATA_ATTR int8_t TXattempts;
extern RTC_DATA_ATTR int8_t RXattempts;

// Variables configurables persistentes
extern ScannedNetwork selectedNW;
extern char currentNetwork[SSID_LENGTH];
extern uint16_t version;
extern size_t sendInterval;
extern int8_t allowPublicConn;
extern GpsData myGpsData;

void initStorage();
void saveNetworkConfig();
void loadNetworkConfig();
void saveNodeConfig();
void loadNodeConfig();
void clearNetworkConfig();
void saveGpsConfig();
void loadGpsConfig();
void clearGpsConfig();
