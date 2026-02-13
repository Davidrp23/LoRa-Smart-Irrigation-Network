#include "Arduino.h"
#include "LoRaWan_APP.h"
#include <Wire.h>               
#include "HT_SSD1306Wire.h"
#include "images.h"

//----------------------------------LORA PARAMETERS--------------------------------
#define RF_FREQUENCY                                868100000 // Hz
#define TX_OUTPUT_POWER                             14        // dBm
#define LORA_BANDWIDTH                              0         // [0: 125 kHz]
#define LORA_SPREADING_FACTOR                       7         // [SF7]
#define LORA_CODINGRATE                             1         // [1: 4/5]
#define LORA_PREAMBLE_LENGTH                        8         
#define LORA_SYMBOL_TIMEOUT                         0         
#define LORA_FIX_LENGTH_PAYLOAD_ON                  false
#define LORA_IQ_INVERSION_ON                        false
#define RX_TIMEOUT_VALUE                            3000 // Aumentado a 3000 para dar margen      
#define MAX_PAYLOAD_SIZE                            240 

//----------------------------------ESTRUCTURAS---------------------------
#define SSID_LENGTH 13 

enum class messageType : uint8_t {
    BEACON_REQUEST = 0x00, BEACON_RESPONSE = 0x01,
    JOIN_REQUEST = 0x02, JOIN_ACCEPTED = 0x03, JOIN_DENIED = 0x04,
    NODE_BLOCKED = 0x05, NODE_LEAVING = 0x06, NODE_LEAVING_ACK = 0x07,
    DATA = 0x20, DATA_CONF = 0x21, DATA_CONF_ACK = 0x22, DATA_ACK = 0x23,
    INVALID = 0xFF 
};

typedef struct __attribute__((packed)) { size_t router; size_t id; } ControlData;
typedef struct __attribute__((packed)) { size_t router; char SSID[SSID_LENGTH]; } NetworkData;
typedef struct __attribute__((packed)) { size_t router; size_t id; size_t sendInterval; } ConfData;
typedef struct __attribute__((packed)) { 
  size_t router; size_t id; uint8_t humidity; uint8_t battery; float latitude; float longitude; 
} SensorsData;

typedef struct __attribute__((packed)) {
    messageType type; uint8_t length; uint16_t checksum;  
    union {
      uint8_t raw[MAX_PAYLOAD_SIZE]; NetworkData NetworkData; ControlData ControlData;
      ConfData ConfData; SensorsData SensorsData;
    } data;
} LoRaMessage;

//----------------------------------VARIABLES---------------------------

//ID'S
const size_t MY_NODE_ID = 50; 
size_t TARGET_ROUTER_ID = 0; 
char currentNetwork[SSID_LENGTH];

// Estadísticas
uint16_t receivedPackets = 0;
uint16_t sendedPackets = 0;
int16_t lastRssi = 0;
bool needDisplayUpdate = false; // BANDERA PARA PINTAR EN EL LOOP

//Sensores
uint8_t humidity = 75;
uint8_t battery = 90;
float latitude = 40.4167;
float longitude = -3.7037;

//----------------------------------Control pantalla ----------------------------------

// --- CONSTANTES DE TIEMPO ---
#define BUTTON_PIN 0            // Botón PRG en Heltec V3
#define DEBOUNCE_MS 50          // Filtro para rebotes
#define LONG_PRESS_MS 1000      // Tiempo para considerar pulsación larga (1s)

// --- ESTADOS DEL BOTÓN (Variable Global) ---
// Usamos un enum para que sea legible en cualquier parte del código
enum ButtonEvent {
  NO_PRESS,     // Nada ha pasado
  SHORT_PRESS,  // Pulsación corta detectada
  LONG_PRESS    // Pulsación larga detectada
};

// Esta es la variable que tu loop() va a leer
volatile ButtonEvent globalButtonState = NO_PRESS;

// --- VARIABLES INTERNAS (No tocar desde fuera) ---
unsigned long pressStartTime = 0;
bool isPressing = false;
bool defaultMenu = 1;

#define SCAN_TIME 6000 //Durante este tiempo (en ms) la mota estara mandando beacon_request a todos los routers que encuentre
//---------------------------------------------------------------------------------------

//Maquina de estados
enum MotaState {
  STATE_INIT,
  STATE_START_SCAN, STATE_TX_SCAN, STATE_RX_SCAN,
  STATE_START_JOIN, STATE_TX_JOIN, STATE_RX_JOIN,
  STATE_START_DATA, STATE_TX_DATA, STATE_RX_DATA,
  STATE_SLEEP
};

MotaState currentState = STATE_INIT;
unsigned long stateStartTime = 0;
unsigned long lastSleepTime = 0; // Para el sleep no bloqueante

static SSD1306Wire display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED);
static RadioEvents_t RadioEvents;

void OnTxDone(void);
void OnTxTimeout(void);
void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr);

void VextON(void) { pinMode(Vext,OUTPUT); digitalWrite(Vext, LOW); }
void VextOFF(void) { pinMode(Vext,OUTPUT); digitalWrite(Vext, HIGH); }

//---------------------------------------------------------------------

void setup() {
  VextON(); 
  delay(100); 

  Serial.begin(115200);
  Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);
  
  initializeOled(); 
  initializeLora();

  pinMode(BUTTON_PIN, INPUT_PULLDOWN);

  currentState = STATE_START_SCAN;
  Serial.println("--- MOTA INICIADA ---");
}



// ---------------- LOOP PRINCIPAL ----------------
void loop() 
{
  //REVISION DE BANDERAS LORA
  Radio.IrqProcess();

  // 1. GESTION DE PANTALLA
  updateOled();
  checkButton();

  // 2. WATCHDOG DE SOFTWARE (SEGURIDAD)
  watchdogRX();

  // 3. MAQUINA DE ESTADOS
  switch (currentState) {
    
    // ================== SCAN ==================
    case STATE_START_SCAN:
      Serial.println("[APP] Enviando Beacon Request...");
      sendBeaconRequest(); 
      currentState = STATE_TX_SCAN; 
      stateStartTime = millis();
      break;

    case STATE_TX_SCAN:
      // Esperando OnTxDone...
      break;

    case STATE_RX_SCAN:
      // Esperando OnRxDone o Watchdog...
      break;

    // ================== JOIN ==================
    case STATE_START_JOIN:
      Serial.println("[APP] Enviando Join Request...");
      sendJoinRequest();
      currentState = STATE_TX_JOIN;
      stateStartTime = millis();
      break;

    case STATE_TX_JOIN: break;
    case STATE_RX_JOIN: break;

    // ================== DATA ==================
    case STATE_START_DATA:
      Serial.println("[APP] Enviando Datos...");
      sendSensorData();
      currentState = STATE_TX_DATA;
      stateStartTime = millis();
      break;
        
    case STATE_TX_DATA: break;
    case STATE_RX_DATA: break;

    // ================== SLEEP (NO BLOQUEANTE) ==================
    case STATE_SLEEP:
        // Usamos millis en vez de delay(1000)
        if (millis() - lastSleepTime > 2000) { // 2 segundos de sleep
          Serial.println("Despertando...");
          currentState = STATE_START_DATA;
        }
        break;
  }
}

// ---------------- CALLBACKS  ----------------

void OnTxDone(void) {
  Serial.println("-> TX Done (IRQ)");
  sendedPackets++;
  needDisplayUpdate = true; // Avisamos al loop, NO pintamos aquí

  // Logica de cambio de estado
  if (currentState == STATE_TX_SCAN) {
    currentState = STATE_RX_SCAN;
    stateStartTime = millis(); // Reset para watchdog
    Radio.Rx(0);
  } 
  else if (currentState == STATE_TX_JOIN) {
    currentState = STATE_RX_JOIN;
    stateStartTime = millis();
    Radio.Rx(0);
  }
  else if (currentState == STATE_TX_DATA) {
    currentState = STATE_RX_DATA;
    stateStartTime = millis();
    Radio.Rx(0);
  }
}

void OnTxTimeout(void) {
  Serial.println("-> TX Timeout");
  currentState = STATE_START_SCAN; 
}

void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr) {
  Serial.printf("<- RX Done (%d bytes)\n", size);
  
  LoRaMessage incomingMsg;
  const size_t MIN_SIZE = sizeof(messageType) + sizeof(uint8_t) + sizeof(uint16_t);

  if (size < MIN_SIZE) return;
  memcpy(&incomingMsg, payload, min((size_t)size, (size_t)MIN_SIZE + MAX_PAYLOAD_SIZE));

  if (calculateChecksum(incomingMsg) != incomingMsg.checksum) {
      Serial.println("Checksum ERROR.");
      return;
  }

  receivedPackets++;
  lastRssi = rssi;
  needDisplayUpdate = true; // Avisamos al loop

  // MAQUINA DE ESTADOS
  switch(incomingMsg.type) {
      case messageType::BEACON_RESPONSE:
          if (currentState == STATE_RX_SCAN) {
            TARGET_ROUTER_ID = incomingMsg.data.NetworkData.router;
            memcpy(currentNetwork, incomingMsg.data.NetworkData.SSID, SSID_LENGTH);
            Serial.println("Router encontrado -> JOIN");
            currentState = STATE_START_JOIN;
          }
          break;

      case messageType::JOIN_ACCEPTED:
          if (currentState == STATE_RX_JOIN) {
            Serial.println("Join aceptado -> DATA");
            currentState = STATE_START_DATA;
          }
          break;

      case messageType::DATA_ACK:
          if (currentState == STATE_RX_DATA) {
            Serial.println("ACK recibido -> SLEEP");
            lastSleepTime = millis(); // Marcamos hora de dormir
            currentState = STATE_SLEEP;
          }
          break;

      case messageType::JOIN_REQUEST:
          if (currentState == STATE_RX_DATA) {
            Serial.println("El router no ha procesado el paquete de datos anterior porque no estaba en la red, enviado solicitud de union...");
            lastSleepTime = millis(); // Marcamos hora de dormir
            currentState = STATE_START_JOIN;
          }
          break;
  }
}

//--------------- FUNCTIONS --------------------

void initializeOled(){
  display.init();
  display.setFont(ArialMT_Plain_10);
  display.clear();
  display.drawXbm(0,5,image_width,image_height,(const unsigned char *)image_bits);
  display.display();
  delay(2500);

  //Draw progress bar 
  for(int counter=0; counter<500; counter++){
    display.clear();
    display.setTextAlignment(TEXT_ALIGN_LEFT);
    display.drawString(0, 0, String("Initializing FLoRa Node..."));

    int progress = (counter / 5) % 100;
    // draw the progress bar
    display.drawProgressBar(0, 38, 120, 10, progress);
    counter++;

    // draw the percentage as String
    display.setTextAlignment(TEXT_ALIGN_CENTER);
    display.drawString(64, 25, String(progress) + "%");
    display.display();
    delay(20);
  }
  display.setTextAlignment(TEXT_ALIGN_LEFT);

}

void initializeLora(){
  RadioEvents.TxDone = OnTxDone;
  RadioEvents.TxTimeout = OnTxTimeout;
  RadioEvents.RxDone = OnRxDone;

  Radio.Init( &RadioEvents );
  Radio.SetChannel( RF_FREQUENCY );
  Radio.SetTxConfig( MODEM_LORA, TX_OUTPUT_POWER, 0, LORA_BANDWIDTH,
                                  LORA_SPREADING_FACTOR, LORA_CODINGRATE,
                                  LORA_PREAMBLE_LENGTH, LORA_FIX_LENGTH_PAYLOAD_ON,
                                  true, 0, 0, LORA_IQ_INVERSION_ON, 3000 );

  Radio.SetRxConfig( MODEM_LORA, LORA_BANDWIDTH, LORA_SPREADING_FACTOR,
                                  LORA_CODINGRATE, 0, LORA_PREAMBLE_LENGTH,
                                  LORA_SYMBOL_TIMEOUT, LORA_FIX_LENGTH_PAYLOAD_ON,
                                  0, true, 0, 0, LORA_IQ_INVERSION_ON, true );
}

uint16_t calculateChecksum(LoRaMessage msg) {
  const size_t buffSize = sizeof(msg.type) + sizeof(msg.length) + msg.length;
  uint8_t buff[buffSize];
  memcpy(&buff, &msg.type , sizeof(msg.type));
  memcpy(&buff[sizeof(msg.type)], &msg.length , sizeof(msg.length));
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

void sendMessage(LoRaMessage msg) {
  msg.checksum = calculateChecksum(msg);
  const size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
  const size_t realPacketSize = headers + msg.length;
  Radio.Send((uint8_t *)&msg, realPacketSize);
}

void sendBeaconRequest() {
  LoRaMessage msg;
  msg.type = messageType::BEACON_REQUEST; msg.length = 0; 
  sendMessage(msg);
}

void sendJoinRequest() {
  LoRaMessage msg;
  msg.type = messageType::JOIN_REQUEST;
  ControlData cdata; cdata.router = TARGET_ROUTER_ID; cdata.id = MY_NODE_ID;
  msg.data.ControlData = cdata; msg.length = sizeof(ControlData);
  sendMessage(msg);
}

void sendSensorData() {
  LoRaMessage msg;
  msg.type = messageType::DATA;
  SensorsData sdata; sdata.router = TARGET_ROUTER_ID; sdata.id = MY_NODE_ID;
  sdata.humidity = humidity; sdata.battery = battery; sdata.latitude = latitude; sdata.longitude = longitude;
  msg.data.SensorsData = sdata; msg.length = sizeof(SensorsData);
  sendMessage(msg);
}

void updateOled(){

  if(globalButtonState == SHORT_PRESS){
    defaultMenu = !defaultMenu;
    globalButtonState = NO_PRESS;
  }

  if(defaultMenu){

    if (needDisplayUpdate) {
      display.clear();
      display.drawString(10, 0, "=== FLoRa Node === 1/2");

      if(TARGET_ROUTER_ID != 0){
        display.drawString(0, 10, "Conected: " + String(currentNetwork));
        display.drawString(0, 20, "RSSI: " + String(lastRssi));
      }else{
        display.drawString(0, 10, "Not Conected");
      }
      
      display.drawString(0, 30, "ID: " + String(MY_NODE_ID) + "| R_ID: " + String(TARGET_ROUTER_ID));
      display.drawString(0, 40, "TX: " + String(sendedPackets) + "| RX: " + String(receivedPackets));
      
      
      
      // Mostrar estado actual para depurar
      String estadoStr = "";

      if(currentState == STATE_RX_SCAN) estadoStr = "Wait Beacon";
      else if(currentState == STATE_RX_JOIN) estadoStr = "Wait Join";
      else if(currentState == STATE_RX_DATA) estadoStr = "Wait ACK";
      else if(currentState == STATE_SLEEP) estadoStr = "Sleeping";
      display.drawString(0, 50, "State: " + estadoStr);

      display.display();
      needDisplayUpdate = false;
    }

  }else{

    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 2/2");
    display.drawString(0, 10, "Bat: " + String(battery) + "%");
    display.drawString(0, 20, "Hum: " + String(humidity) + "%");

    if(latitude != 0 && longitude != 0){
      display.drawString(0, 30, "GPS: OK");
      display.drawString(0, 40, "Lat: " + String(latitude , 6));
      display.drawString(0, 50, "Long: " + String(longitude , 6));
    }else{
      display.drawString(0, 30, "GPS: FAIL");
    }
    
    display.display();

  }
  
}

void watchdogRX(){
  // Si llevamos más de (RX_TIMEOUT + 1000ms) esperando, forzamos reinicio.
  if ((currentState == STATE_RX_SCAN || currentState == STATE_RX_JOIN || currentState == STATE_RX_DATA) 
    && (millis() - stateStartTime > (RX_TIMEOUT_VALUE + 1000))) {
    
    Serial.println("[WATCHDOG] Hardware RX colgado. Reiniciando...");
    Radio.Sleep();
    
    // Decisión de recuperación
    if(currentState == STATE_RX_DATA) currentState = STATE_START_DATA;
    else currentState = STATE_START_SCAN;
  }
}

void checkButton() {
  // Leemos el botón (recordamos que LOW es pulsado en Heltec V3)
  bool currentState = (digitalRead(BUTTON_PIN) == LOW);

  // 1. FLANCO DE BAJADA (Detectar inicio de pulsación)
  if (currentState && !isPressing) {
    isPressing = true;
    pressStartTime = millis();
  }

  // 2. FLANCO DE SUBIDA (Detectar que se ha soltado)
  if (!currentState && isPressing) {
    isPressing = false;
    
    // Calculamos cuánto duró la pulsación
    unsigned long duration = millis() - pressStartTime;

    // 3. CLASIFICACIÓN DEL EVENTO
    if (duration < DEBOUNCE_MS) {
      // Fue ruido, no hacemos nada
      globalButtonState = NO_PRESS; 
    } 
    else if (duration < LONG_PRESS_MS) {
      // Fue una pulsación válida y rápida
      globalButtonState = SHORT_PRESS;
    } 
    else {
      // Fue una pulsación larga
      globalButtonState = LONG_PRESS;
    }
  }
}