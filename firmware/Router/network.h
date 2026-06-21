#pragma once
#include <Arduino.h>
#include <vector>
#include "types.h"
#include "config.h"
#include "display.h"
#include "lora_router.h"
#include <ArduinoJson.h>

// Extern Network Data
extern NetworkData NETWORK_DATA;

// Router params
extern size_t connectedClients[MAX_CLIENTS];
extern std::vector<TimestampedSensorsData> motasDataQueue; //Cola para almacenar los datos de las motas (con timestamp del router)
extern std::vector<ConfData> motasConf; //Cola para almacenar las configuraciones de las motas

struct ClientCryptoState {
  size_t id;
  uint32_t lastFCnt;
  uint32_t lastJoinCnt;
};
extern std::vector<ClientCryptoState> clientCryptoStates;

extern uint8_t activeClients;

// Clients Managment
char getClientIndex(const size_t client);
void addClient(const size_t client);
bool deleteClient(const size_t client);
char getClientCryptoStateIndex(size_t client);

// Config Management
void parseBigPacketResponse(String response);
ConfData searchMotaConf(size_t id);
void deleteMotaConf(size_t id);
