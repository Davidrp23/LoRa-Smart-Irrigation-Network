#include <Arduino.h>
#include "LoRaWan_APP.h"
#include <Wire.h>
#include "types.h"
#include "config.h"
#include "storage.h"
#include "display.h"
#include "lora_node.h"
#include "sensors.h"
#include "Battery.h"
#include "images.h"

// Variables Globales necesarias para la maquina de estados
MotaState currentState = STATE_INIT;
unsigned long stateStartTime = 0;
unsigned long lastSleepTime = 0;
unsigned long startLeavingState = 0;
unsigned long startScan = 0;
unsigned long lastBeaconFrameSended = 0;
uint8_t scaningChanel = 0;
std::vector<ScannedNetwork> foundNetworks;
bool needDisplayUpdate = false;
uint8_t defaultMenu = 0;
volatile ButtonEvent globalButtonState = NO_PRESS;
int selectedNetworkIndex = 0;

humData myHumData = {0};
batteryStatus senderBattery = {0};

void VextON(void) {
  pinMode(Vext, OUTPUT);
  digitalWrite(Vext, LOW);
}
void VextOFF(void) {
  pinMode(Vext, OUTPUT);
  digitalWrite(Vext, HIGH);
}
void EnableADC(){
  pinMode(37, OUTPUT);
  digitalWrite(37, HIGH);
}

void setup() {
  VextON();
  delay(500);
  EnableADC();
  delay(200);
  analogReadResolution(12);
  delay(200);

  Serial.begin(115200);

  Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);
  pinMode(BUTTON_PIN, INPUT);

  // Wake up pin for deep sleep (Ext0 wake up on low)
  esp_sleep_enable_ext0_wakeup((gpio_num_t)BUTTON_PIN, 0);

  initStorage();

  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  
  if (wakeup_reason == ESP_SLEEP_WAKEUP_TIMER || wakeup_reason == ESP_SLEEP_WAKEUP_EXT0) {
    if (wakeup_reason == ESP_SLEEP_WAKEUP_TIMER) {
      Serial.println("--- MOTA DESPIERTA (TIMER) ---");
    } else {
      Serial.println("--- MOTA DESPIERTA (BOTÓN) ---");
    }
    
    // Restablecemos intentos al despertar para un ciclo normal
    TXattempts = 3;
    RXattempts = 3;
    
    // Si tenemos red configurada, vamos a medir y enviar
    if (selectedNW.info.router != 0) {
      if (!selectedNW.connected) {
        currentState = STATE_START_JOIN;
      } else {
        currentState = STATE_START_DATA;
      }
    } else {
      currentState = STATE_START_SCAN;
    }
  } else {
    // Primer arranque o Reset Hardware
    Serial.println("--- MOTA INICIADA (COLD BOOT) ---");
    
    //Imprimimos el logo de inicio por serie
    Serial.println(SerialLogoFlora);
    
    // Restablecer variables RTC a su valor inicial
    receivedPackets = 0;
    sendedPackets = 0;
    lastRssi = 0;
    rx_err = 0;
    tx_err = 0;
    channelBusyErrors = 0;
    missingAckErrors = 0;
    changeRouterAttempts = 7;
    TXattempts = 3;
    RXattempts = 3;
    
    if (selectedNW.info.router != 0) {
      if (!selectedNW.connected) {
        currentState = STATE_START_JOIN;
      } else {
        currentState = STATE_START_DATA;
      }
    } else {
      currentState = STATE_START_SCAN;
    }
  }

  if (wakeup_reason != ESP_SLEEP_WAKEUP_TIMER) {
    bool isColdBoot = (wakeup_reason != ESP_SLEEP_WAKEUP_EXT0);
    initializeOled(isColdBoot);
    lastButtonActivity = millis();
  } else {
    isOledInitialized = false;
  }
  
  initializeLora();

  if(!gpsInit()){
    Serial.println("Fallo la inicializacion del GPS");
  }
 
  if(!humInit()){
    Serial.println("Fallo la inicializacion del lector de humedad");
  }

  // Leer sensores incondicionalmente al iniciar
  readHum(myHumData);
  senderBattery = checkBatteryStatus();
}

void loop() {
  if (isOledInitialized) {
    if (currentState == STATE_WAIT_USER_SELECTION) {
      handleNetworkSelectionMenu();
    } else {
      updateOled(myHumData, myGpsData, senderBattery);
    }
  }

  Radio.IrqProcess();
  checkButton();
  watchdogRX();

  switch (currentState) {
    case STATE_START_SCAN:
      Serial.println("Comenzando a escanear redes...");
      startScan = millis();
      currentState = STATE_TX_SCAN;
      foundNetworks.clear();
      break;

    case STATE_TX_SCAN:
      if (millis() > lastBeaconFrameSended + random(1000, 1500)) {
        if (scaningChanel > NUM_CHANELS - 1) scaningChanel = 0;
        Serial.println("[APP] Enviando Beacon Request...");
        Radio.SetChannel(channelList[scaningChanel]);
        sendBeaconRequest();
        lastBeaconFrameSended = millis();
      }
      stateStartTime = millis();
      break;

    case STATE_RX_SCAN:
      if (millis() > startScan + SCAN_TIME) {
        Serial.println("Fin del escaneo.");
        if(selectedNW.info.router == 0){
          selectedNetworkIndex = 0;
          currentState = STATE_WAIT_USER_SELECTION;
        }else if(selectedNW.info.router != 0 && selectedNW.connected && allowPublicConn == 1){
          if (foundNetworks.empty()) {
            Serial.println("No se encontraron redes. (auto)");
            lastSleepTime = millis();
            currentState = STATE_SLEEP;
            return;
          }
          for(ScannedNetwork sc:foundNetworks){
            if(sc.info.isPublic){
              selectedNW = sc;
              memcpy(currentNetwork, selectedNW.info.SSID, SSID_LENGTH);
              saveNetworkConfig();
              Radio.SetChannel(channelList[selectedNW.channel]);
              Serial.printf("Intentando la conexion con un router publico (R_ID: %d) (auto)\n",sc.info.router);
              currentState = STATE_START_JOIN;
              return;
            }
          }
          Serial.println("Ninguna red era publica.");
          lastSleepTime = millis();
          currentState = STATE_SLEEP;
        }
      }
      break;

    case STATE_WAIT_USER_SELECTION:
      break;

    case STATE_START_JOIN:
      Serial.println("[APP] Enviando Join Request...");
      sendJoinRequest();
      currentState = STATE_TX_JOIN;
      stateStartTime = millis();
      break;

    case STATE_TX_JOIN: break;
    case STATE_RX_JOIN: break;

    case STATE_START_DATA:
      Serial.println("[APP] Enviando Datos...");
      // Ya no necesitamos leer la humedad aquí, se lee al iniciar
      sendSensorData(myHumData.percentage, senderBattery.batteryPercentage, myGpsData.latitude, myGpsData.longitude);
      currentState = STATE_TX_DATA;
      stateStartTime = millis();
      break;

    case STATE_TX_DATA: break;
    case STATE_RX_DATA: break;

    case STATE_SLEEP:
      if (isOledInitialized && (millis() - lastButtonActivity < 30000)) {
          // Mantener la mota despierta a la espera de inactividad
          break;
      }
      
      Serial.println("Entrando en Deep Sleep...");
      Radio.Sleep();
      SPI.end(); 

      pinMode(RADIO_DIO_1, ANALOG);
      pinMode(RADIO_NSS, ANALOG);
      pinMode(RADIO_RESET, ANALOG);
      pinMode(RADIO_BUSY, ANALOG);
      pinMode(LORA_CLK, ANALOG);
      pinMode(LORA_MISO, ANALOG);
      pinMode(LORA_MOSI, ANALOG);
      
      VextOFF();
      
      esp_sleep_enable_timer_wakeup((uint64_t)sendInterval * 1000ULL);
      esp_deep_sleep_start();
      break;

    case STATE_LEAVING_NETWORK:
      if(millis() - startLeavingState > 2000 ){
        clearNetworkConfig();
        defaultMenu = 0;
        currentState = STATE_START_SCAN;
        needDisplayUpdate = true;
      }
      break;
  }
}
