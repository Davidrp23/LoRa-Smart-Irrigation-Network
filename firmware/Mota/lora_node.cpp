#include "storage.h"
#include "types.h"
#include "lora_node.h"
#include <algorithm>
#include <mbedtls/aes.h>

const uint32_t channelList[NUM_CHANELS] = { CHANEL_0, CHANEL_1, CHANEL_2, CHANEL_3 };
static RadioEvents_t RadioEvents;

const unsigned char crypto_key[16] = "59mkla3Qh0kC0eR";
const unsigned char crypto_iv[16] = {0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10};
RTC_DATA_ATTR uint32_t global_msg_id = 0;

void processCrypto(uint8_t* payload, size_t length) {
  mbedtls_aes_context aes;
  mbedtls_aes_init(&aes);
  mbedtls_aes_setkey_enc(&aes, crypto_key, 128);
  
  unsigned char iv_copy[16];
  memcpy(iv_copy, crypto_iv, 16);
  
  unsigned char stream_block[16];
  size_t nc_off = 0;
  
  mbedtls_aes_crypt_ctr(&aes, length, &nc_off, iv_copy, stream_block, payload, payload);
  mbedtls_aes_free(&aes);
}


void OnTxDone(void);
void OnTxTimeout(void);
void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr);
uint16_t calculateChecksum(LoRaMessage msg);
void encryptAndMAC(LoRaMessage& msg);
bool sendMessage(LoRaMessage msg);
bool isForMe(size_t receiverId, size_t routerId);
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
  const size_t buffSize = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.fcnt) + msg.length;
  uint8_t buff[buffSize];
  size_t offset = 0;
  memcpy(buff + offset, &msg.type, sizeof(msg.type)); offset += sizeof(msg.type);
  memcpy(buff + offset, &msg.length, sizeof(msg.length)); offset += sizeof(msg.length);
  memcpy(buff + offset, &msg.fcnt, sizeof(msg.fcnt)); offset += sizeof(msg.fcnt);
  memcpy(buff + offset, &msg.data, msg.length);

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

void encryptAndMAC(LoRaMessage& msg) {
  if (msg.length > 0) {
    Serial.printf("[CRYPTO] Encriptando payload TX de %d bytes...\n", msg.length);
    processCrypto(msg.data.raw, msg.length);
  }
  msg.checksum = calculateChecksum(msg);
}

bool sendMessage(LoRaMessage msg) {
  encryptAndMAC(msg);
  const size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.fcnt) + sizeof(msg.checksum);
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
  
  join_cnt++;
  saveJoinCnt();
  msg.fcnt = join_cnt;
  
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

  global_msg_id++;
  msg.fcnt = global_msg_id;

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
  sdata.lastSnr = lastSnr;
  sdata.rx_err = rx_err;
  sdata.tx_err = tx_err;
  sdata.channelBusyErrors = channelBusyErrors;
  sdata.missingAckErrors = missingAckErrors;
  sdata.crypto_err = crypto_err;
  sdata.crc_err = crc_err;
  sdata.version = version;

  msg.data.SensorsData = sdata;
  msg.length = sizeof(SensorsData);
  
  global_msg_id++;
  msg.fcnt = global_msg_id;
  
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

  global_msg_id++;
  msg.fcnt = global_msg_id;

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
  const size_t MIN_SIZE = sizeof(messageType) + sizeof(uint8_t) + sizeof(uint32_t) + sizeof(uint16_t);

  if (size < MIN_SIZE) {
    rx_err++;
    return;
  }

  memcpy(&incomingMsg, payload, min((size_t)size, (size_t)MIN_SIZE + MAX_PAYLOAD_SIZE));

  if (calculateChecksum(incomingMsg) != incomingMsg.checksum) {
    crc_err++;
    rx_err++;
    Serial.println("Checksum ERROR.");
    return;
  }
  
  if (incomingMsg.length > 0) {
    Serial.println("[CRYPTO] Checksum valido. Desencriptando payload RX...");
    processCrypto(incomingMsg.data.raw, incomingMsg.length);
  }

  receivedPackets++;
  lastRssi = rssi;
  lastSnr = snr;
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
      if (!isForMe(incomingMsg.data.ControlData.id, incomingMsg.data.ControlData.router)) return;

      if (currentState == STATE_RX_JOIN) {
        Serial.println("Join aceptado -> DATA");
        selectedNW.connected = true;
        saveNetworkConfig(); // Persist that we are connected
        
        showAlertOled("Join accepted");
        currentState = STATE_START_DATA;
      }
      break;

    case messageType::JOIN_DENIED:
      if (!isForMe(incomingMsg.data.ControlData.id, incomingMsg.data.ControlData.router)) return;

      if (currentState == STATE_RX_JOIN) {
        Serial.println("Join denegado -> SLEEP");
        selectedNW.connected = false;
        clearNetworkConfig();
        
        showAlertOled("Join denied");
        lastSleepTime = millis();
        currentState = STATE_SLEEP;
      }
      break;

    case messageType::DATA_ACK:
      if (!isForMe(incomingMsg.data.ControlData.id, incomingMsg.data.ControlData.router)) return;
      if (currentState == STATE_RX_DATA) {
        Serial.println("ACK recibido -> SLEEP");
        lastSleepTime = millis();
        currentState = STATE_SLEEP;
      }
      break;

    case messageType::DATA_CONF:
      if (!isForMe(incomingMsg.data.ControlData.id, incomingMsg.data.ControlData.router)) return;
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
      if (!isForMe(incomingMsg.data.ControlData.id, incomingMsg.data.ControlData.router)) return;
      if (currentState == STATE_RX_DATA) {
        Serial.println("El router no ha procesado el paquete de datos anterior, uniendo...");
        lastSleepTime = millis();
        currentState = STATE_START_JOIN;
      }
      break;

    case messageType::NODE_LEAVING_ACK:
      if (!isForMe(incomingMsg.data.ControlData.id, incomingMsg.data.ControlData.router)) return;
      Serial.println("El router confirma que podemos irnos de la red");
      break;
      
    case messageType::CRYPTO_ERROR:
      if (!isForMe(incomingMsg.data.ControlData.id, incomingMsg.data.ControlData.router)) return;
      Serial.println("[CRYPTO] El router informa de desincronización de FCnt. Iniciando JOIN...");
      crypto_err++;
      lastSleepTime = millis();
      currentState = STATE_START_JOIN;
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

bool isForMe(size_t receiverId, size_t routerId) {
  if (receiverId == MY_NODE_ID && routerId == selectedNW.info.router) {
    return true;
  } else {
    Serial.printf("Mensaje para otro destinatario o proveniente de otro router (ID: %zu) (R_ID: %zu). Ignorando...\n", receiverId, routerId);
    return false;
  }
}

void applyConfig(ConfData config) {
  if (config.version <= 0 || config.version <= version) {
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
