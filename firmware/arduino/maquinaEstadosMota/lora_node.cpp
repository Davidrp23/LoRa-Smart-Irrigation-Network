#include "lora_node.h"
#include <algorithm>

const uint32_t channelList[NUM_CHANELS] = { CHANEL_0, CHANEL_1, CHANEL_2, CHANEL_3 };
static RadioEvents_t RadioEvents;

void OnTxDone(void);
void OnTxTimeout(void);
void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr);
uint16_t calculateChecksum(LoRaMessage msg);
bool sendMessage(LoRaMessage msg);
bool isForMe(size_t receiverId);
void applyConfig(ConfData config);
void saveNetwork(NetworkData newNet, int16_t currentRssi, uint8_t currentChannel);

void initializeLora() {
  RadioEvents.TxDone = OnTxDone;
  RadioEvents.TxTimeout = OnTxTimeout;
  RadioEvents.RxDone = OnRxDone;

  Radio.Init(&RadioEvents);
  Radio.SetChannel(channelList[selectedNW.channel]);
  Radio.SetTxConfig(MODEM_LORA, TX_OUTPUT_POWER, 0, LORA_BANDWIDTH,
                    LORA_SPREADING_FACTOR, LORA_CODINGRATE,
                    LORA_PREAMBLE_LENGTH, LORA_FIX_LENGTH_PAYLOAD_ON,
                    true, 0, 0, LORA_IQ_INVERSION_ON, 3000);

  Radio.SetRxConfig(MODEM_LORA, LORA_BANDWIDTH, LORA_SPREADING_FACTOR,
                    LORA_CODINGRATE, 0, LORA_PREAMBLE_LENGTH,
                    LORA_SYMBOL_TIMEOUT, LORA_FIX_LENGTH_PAYLOAD_ON,
                    0, true, 0, 0, LORA_IQ_INVERSION_ON, true);
}

uint16_t calculateChecksum(LoRaMessage msg) {
  const size_t buffSize = sizeof(msg.type) + sizeof(msg.length) + msg.length;
  uint8_t buff[buffSize];
  memcpy(&buff, &msg.type, sizeof(msg.type));
  memcpy(&buff[sizeof(msg.type)], &msg.length, sizeof(msg.length));
  memcpy(&buff[sizeof(msg.type) + sizeof(msg.length)], &msg.data, msg.length);

  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < sizeof(buff); i++) {
    crc ^= (uint16_t)buff[i] << 8;
    for (int j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
    }
  }
  return crc;
}

bool sendMessage(LoRaMessage msg) {
  msg.checksum = calculateChecksum(msg);
  const size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
  const size_t realPacketSize = headers + msg.length;

  Serial.printf("Enviando un paquete de %zuB\n", realPacketSize);

  int8_t attempts = 3;
  delay(50);
  while (attempts > 0) {
    if (IsChannelFree()) {
      Radio.Send((uint8_t *)&msg, realPacketSize);
      return true;
    } else {
      int16_t currentRssi = Radio.Rssi(MODEM_LORA);
      Serial.printf("DEBUG -> Intento %d: Canal ocupado. RSSI actual: %d dBm (Límite: %d)\n", 4 - attempts, currentRssi, RSSI_THRESHOLD);
      delay(random(50, 200));
      channelBusyErrors++;
    }
    attempts--;
  }
  Serial.printf("No se ha podido enviar el mensaje. Causa: Canal ocupado.\n");
  return false;
}

void sendBeaconRequest() {
  LoRaMessage msg;
  msg.type = messageType::BEACON_REQUEST;
  msg.length = 0;
  if (!sendMessage(msg)) {
    currentState = STATE_TX_SCAN;
  }
}

void sendJoinRequest() {
  LoRaMessage msg;
  msg.type = messageType::JOIN_REQUEST;
  ControlData cdata;
  cdata.router = selectedNW.info.router;
  cdata.id = MY_NODE_ID;
  msg.data.ControlData = cdata;
  msg.length = sizeof(ControlData);
  if (!sendMessage(msg)) {
    currentState = STATE_START_JOIN;
  }
}

void sendNodeLeaving() {
  LoRaMessage msg;
  msg.type = messageType::NODE_LEAVING;
  ControlData cdata;
  cdata.router = selectedNW.info.router;
  cdata.id = MY_NODE_ID;
  msg.data.ControlData = cdata;
  msg.length = sizeof(ControlData);
  sendMessage(msg);
}

void sendSensorData(uint8_t humPercentage, uint8_t batPercentage, float lat, float lon) {
  LoRaMessage msg;
  msg.type = messageType::DATA;
  SensorsData sdata;

  sdata.router = selectedNW.info.router;
  sdata.id = MY_NODE_ID;
  sdata.humidity = humPercentage;
  sdata.battery = batPercentage;
  sdata.latitude = lat;
  sdata.longitude = lon;
  sdata.receivedPackets = receivedPackets;
  sdata.sendedPackets = sendedPackets;
  sdata.lastRssi = lastRssi;
  sdata.rx_err = rx_err;
  sdata.tx_err = tx_err;
  sdata.channelBusyErrors = channelBusyErrors;
  sdata.missingAckErrors = missingAckErrors;

  msg.data.SensorsData = sdata;
  msg.length = sizeof(SensorsData);
  if (!sendMessage(msg)) {
    lastSleepTime = millis();
    currentState = STATE_SLEEP;
  }
}

void sendDataConfACK() {
  LoRaMessage msg;
  msg.type = messageType::DATA_CONF_ACK;
  ControlData cdata;
  cdata.router = selectedNW.info.router;
  cdata.id = MY_NODE_ID;
  msg.data.ControlData = cdata;
  msg.length = sizeof(ControlData);
  sendMessage(msg);
}

void OnTxDone(void) {
  Serial.println("-> TX Done (IRQ)");
  sendedPackets++;
  needDisplayUpdate = true;

  if (currentState == STATE_TX_SCAN) {
    currentState = STATE_RX_SCAN;
    stateStartTime = millis();
  } else if (currentState == STATE_TX_JOIN) {
    currentState = STATE_RX_JOIN;
    stateStartTime = millis();
  } else if (currentState == STATE_TX_DATA) {
    currentState = STATE_RX_DATA;
    stateStartTime = millis();
  }
  Radio.Rx(0);
}

void OnTxTimeout(void) {
  Serial.println("-> TX Timeout");
  tx_err++;
  TXattempts--;

  if (TXattempts <= 0) {
    lastSleepTime = millis();
    currentState = STATE_SLEEP;
  }
}

void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr) {
  Serial.printf("<- RX Done (%d bytes)\n", size);

  LoRaMessage incomingMsg = {};
  const size_t MIN_SIZE = sizeof(messageType) + sizeof(uint8_t) + sizeof(uint16_t);

  if (size < MIN_SIZE) {
    rx_err++;
    return;
  }

  memcpy(&incomingMsg, payload, min((size_t)size, (size_t)MIN_SIZE + MAX_PAYLOAD_SIZE));

  if (calculateChecksum(incomingMsg) != incomingMsg.checksum) {
    rx_err++;
    Serial.println("Checksum ERROR.");
    return;
  }

  receivedPackets++;
  lastRssi = rssi;
  needDisplayUpdate = true;

  if (incomingMsg.data.ControlData.router == selectedNW.info.router){
    TXattempts = 3; 
    RXattempts = 3; 
    changeRouterAttempts = 7;
  }
  
  switch (incomingMsg.type) {
    case messageType::BEACON_RESPONSE:
      if (currentState == STATE_RX_SCAN && millis() <= startScan + SCAN_TIME) {
        saveNetwork(incomingMsg.data.NetworkData, rssi, scaningChanel);
        scaningChanel++;
        currentState = STATE_TX_SCAN;
      }
      break;

    case messageType::JOIN_ACCEPTED:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;

      if (currentState == STATE_RX_JOIN) {
        Serial.println("Join aceptado -> DATA");
        selectedNW.connected = true;
        saveNetworkConfig(); // Persist that we are connected
        currentState = STATE_START_DATA;
      }
      break;

    case messageType::DATA_ACK:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;
      if (currentState == STATE_RX_DATA) {
        Serial.println("ACK recibido -> SLEEP");
        lastSleepTime = millis();
        currentState = STATE_SLEEP;
      }
      break;

    case messageType::DATA_CONF:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;
      if (currentState == STATE_RX_DATA) {
        Serial.println("Se ha recibido un paquete de configuracion. Aplicando...");
        ConfData config = incomingMsg.data.ConfData;
        applyConfig(config);
        sendDataConfACK();
        lastSleepTime = millis();
        currentState = STATE_SLEEP;
      }
      break;

    case messageType::JOIN_REQUEST:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;
      if (currentState == STATE_RX_DATA) {
        Serial.println("El router no ha procesado el paquete de datos anterior, uniendo...");
        lastSleepTime = millis();
        currentState = STATE_START_JOIN;
      }
      break;

    case messageType::NODE_LEAVING_ACK:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;
      Serial.println("El router confirma que podemos irnos de la red");
      break;
  }
}

bool compareRSSI(const ScannedNetwork &a, const ScannedNetwork &b) {
  return a.rssi > b.rssi;
}

void saveNetwork(NetworkData newNet, int16_t currentRssi, uint8_t currentChannel) {
  bool found = false;

  for (int i = 0; i < foundNetworks.size(); i++) {
    if (foundNetworks[i].info.router == newNet.router) {
      foundNetworks[i].rssi = currentRssi;
      found = true;
      break;
    }
  }

  if (!found) {
    ScannedNetwork scanned;
    scanned.info = newNet;
    scanned.rssi = currentRssi;
    scanned.channel = currentChannel;
    scanned.connected = false;

    foundNetworks.push_back(scanned);
    Serial.printf("Nueva red: %s (RSSI: %d) [CANAL: %d] [PUBLICO: %s] \n",
                  newNet.SSID, currentRssi, currentChannel, newNet.isPublic ? "Si" : "No");
  }
  std::sort(foundNetworks.begin(), foundNetworks.end(), compareRSSI);
}

bool isForMe(size_t receiverId) {
  if (receiverId == MY_NODE_ID) {
    return true;
  } else {
    Serial.printf("Mensaje para otro destinatario (ID: %zu). Ignorando...\n", receiverId);
    return false;
  }
}

void applyConfig(ConfData config) {
  if (config.version <= 0 && config.version <= version) {
    Serial.println("Version de configuracion invalida, ignorando...");
    return;
  }

  if (config.sendInterval > 0) {
    sendInterval = config.sendInterval * 60 * 1000;
  } else {
    Serial.println("Configuracion de sendInterval invalida. Ignorando...");
  }

  if (config.allowPublicConn > -1 && config.allowPublicConn <= 1) {
    allowPublicConn = config.allowPublicConn;
  } else {
    Serial.println("Configuracion de allowPublicConn invalida. Ignorando...");
  }

  version = config.version;
  saveNodeConfig(); // Guardamos configuración en NVS
  needDisplayUpdate = true;
}

bool IsChannelFree() {
  int16_t currentRssi = Radio.Rssi(MODEM_LORA);
  return (currentRssi < RSSI_THRESHOLD);
}

void watchdogRX() {
  if ((currentState == STATE_RX_SCAN || currentState == STATE_RX_DATA)
    && (millis() - stateStartTime > RX_TIMEOUT_VALUE)) {

    Radio.Sleep();

    if (currentState == STATE_RX_DATA) {
      Serial.println("[WATCHDOG] Hardware RX colgado. Reiniciando...");
      currentState = STATE_START_DATA;
      RXattempts--;
      changeRouterAttempts--;
      
      if (RXattempts < 0) RXattempts = 0;
      if (changeRouterAttempts < 0) changeRouterAttempts = 0;
      
      missingAckErrors++;

      if(changeRouterAttempts <= 0 && allowPublicConn == 1){
        currentState = STATE_START_SCAN;
      }else if (RXattempts <= 0) {
        lastSleepTime = millis();
        currentState = STATE_SLEEP;
      }
    } else {
      Serial.println("[WATCHDOG] Ningun router contesta al Beacon Frame. Cambiando de canal...");
      currentState = STATE_TX_SCAN;
      scaningChanel++;
    }
  }else if(currentState == STATE_RX_JOIN ){
    if(!selectedNW.info.isPublic && (millis() - stateStartTime > RX_PRIVATE_NW_JOIN_TIMEOUT_VALUE)){
      Serial.println("[WATCHDOG] Se sobrepaso el timeot para unise a una red privada");
      lastSleepTime = millis();
      currentState = STATE_SLEEP;
    }else if(selectedNW.info.isPublic && (millis() - stateStartTime > RX_TIMEOUT_VALUE)){
      Serial.println("[WATCHDOG] Se sobrepaso el timeot para unise a una red publica");
      lastSleepTime = millis();
      currentState = STATE_SLEEP;
    }
  }
}
