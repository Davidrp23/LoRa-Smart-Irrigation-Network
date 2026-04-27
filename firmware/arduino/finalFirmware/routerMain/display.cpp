#include "config.h"
#include "display.h"
#include <Wire.h>               
#include "HT_SSD1306Wire.h"
#include "images.h"

static SSD1306Wire display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED); // addr , freq , i2c group , resolution , rst

// Candado para proteger las variables compartidas
SemaphoreHandle_t statsMutex; 
SemaphoreHandle_t buttonStateMutex; 
SemaphoreHandle_t networkMutex;
SemaphoreHandle_t loraTxSemaphore;
// Variables globales protegidas
volatile size_t shared_rx = 0;
volatile size_t shared_tx = 0;
volatile size_t shared_rx_err = 0;
volatile size_t shared_tx_err = 0;
volatile int16_t shared_rssi = 0;
volatile size_t shared_queueFull = 0;
volatile uint8_t shared_queueSize = 0;
volatile uint8_t shared_waiting_conf = 0;
volatile uint16_t shared_channelBusyErrors = 0;
volatile int8_t shared_connectedClients = 0;
volatile size_t shared_crc_err = 0;
volatile size_t shared_crypto_err = 0;
size_t shared_lastClient = 0;
volatile int8_t shared_coverage = 0;
volatile TickType_t shared_firstPktTimestamp = 0;


// OLED UI 
uint8_t defaultMenu = 0; 

// Button variables
unsigned long pressStartTime = 0;
bool isPressing = false;
volatile ButtonEvent globalButtonState = NO_PRESS;
volatile unsigned long shared_lastButtonActivity = 0;
bool isOledOn = true;

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
    display.drawString(0, 0, String("Initializing FLoRa Router..."));

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
  shared_lastButtonActivity = millis();
}

void TaskDisplay(void *pvParameters) {
  
  DisplayStats localStats; // Hacemos una copia local para dibujar en la pantalla sin condiciones de carrera

  for (;;) { // Bucle infinito

    //Cogemos el mutex para leer globalButtonState y modificarlo si hace falta (core 1 tambien lo puede modificar)
    if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
      if(globalButtonState == SHORT_PRESS && isOledOn){ //Para que o avance por el menu si la pantalla esta apagada
        defaultMenu++;
        if (defaultMenu > 3) defaultMenu = 0;
        globalButtonState = NO_PRESS;
      }
      xSemaphoreGive(buttonStateMutex);
    }

    // Comprobar inactividad
    if (millis() - shared_lastButtonActivity > 30000) {
      if (isOledOn) {
        display.displayOff();
        isOledOn = false;
      }
      vTaskDelay(500 / portTICK_PERIOD_MS);
      continue; // No pintamos en pantalla si está apagada
    } else {
      if (!isOledOn) {
        display.displayOn();
        isOledOn = true;
      }
    }
    
    // 1. COPIAR DATOS (SECCIÓN CRÍTICA)
    // Intentamos coger el mutex. Si el Core 1 lo tiene ocupado, esperamos máx 10ms.
    if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
        // Copiamos rápido las variables globales a locales
        localStats.rx_pkts = shared_rx;
        localStats.tx_pkts = shared_tx;
        localStats.rx_err = shared_rx_err;
        localStats.tx_err = shared_tx_err;
        localStats.last_client = shared_lastClient;
        localStats.last_rssi = shared_rssi;
        localStats.queueFull = shared_queueFull;
        localStats.queueSize = shared_queueSize;
        localStats.waiting_conf = shared_waiting_conf;
        localStats.channelBusyErrors = shared_channelBusyErrors;
        localStats.connectedClients = shared_connectedClients;
        localStats.crc_err = shared_crc_err;
        localStats.crypto_err = shared_crypto_err;
        localStats.version = version;
        localStats.coverage = shared_coverage;
        // Soltamos el mutex
        xSemaphoreGive(statsMutex);
    }
    
    // 2. PINTAR EN PANTALLA (LENTO)
    // Esto puede tardar lo que quiera, NO bloqueará a la radio
    display.clear();
    if(defaultMenu == 0){
      display.drawString(10, 0,  "== FLoRa Router == 1/4");
      display.drawString(0, 15, "ID: " + String(routerId) + " |" + String(SSID) + "[CH: " + String((int)numChannel) + "]"); 
      display.drawString(0, 25, "TX: " + String(localStats.tx_pkts) + " | Err: " + String(localStats.tx_err));
      display.drawString(0, 35, "RX: " + String(localStats.rx_pkts) + " | Err: " + String(localStats.rx_err));
      display.drawString(0, 45, "RSSI: " + String(localStats.last_rssi) + " | RXID: " + String(localStats.last_client));

      //Dibujar un candado cerrado si la red es privada y abierto si es publica
      if(isPublic){
        display.drawXbm(120, 17, emoji_width, emoji_height, icon_unlock);
      }else{
        display.drawXbm(120, 17, emoji_width, emoji_height, icon_lock);
      }

    }else if (defaultMenu == 1){
      display.drawString(10, 0,  "== FLoRa Router == 2/4");
      display.drawString(0, 15, "Mote Data Q : " + String(localStats.queueSize));
      display.drawString(0, 25, "Data Ovflw : " + String(localStats.queueFull));
      display.drawString(0, 35, "Conf Pend : " + String(localStats.waiting_conf));
      display.drawString(0, 45, "ChannelBusyErrors : " + String(localStats.channelBusyErrors));

    }else if (defaultMenu == 2){
      display.drawString(10, 0,  "== FLoRa Router == 3/4");
      display.drawString(0, 15, "Clients : " + String(localStats.connectedClients));
      display.drawString(0, 25, "Crypto Errors : " + String(localStats.crypto_err));
      display.drawString(0, 35, "CRC Errors : " + String(localStats.crc_err));
      display.drawString(0, 45, "Version : " + String(localStats.version) + ".0" );
      display.drawString(0, 45, "GPRS CSQ : " + String(localStats.coverage));

    }else if (defaultMenu == 3){
      display.drawString(10, 0,  "== FLoRa Router == 4/4");
      display.drawString(0, 15, "GPRS CSQ : " + String(localStats.coverage));
    }

    // Barra de vida o animación para saber que no está colgado
    display.drawString(120, 45, (millis() / 1000) % 2 == 0 ? "." : "..");
    
    display.display();

    // 3. DORMIR TAREA
    // Actualizamos la pantalla 2 veces por segundo (cada 500ms)
    // vTaskDelay es vital para no saturar el Core 0 y que el Watchdog no salte
    vTaskDelay(500 / portTICK_PERIOD_MS); 
  }
}

void checkButton() {
  // Leemos el botón (recordamos que LOW es pulsado en Heltec V3)
  bool currentState = (digitalRead(BUTTON_PIN) == LOW);

  // 1. FLANCO DE BAJADA (Detectar inicio de pulsación)
  if (currentState && !isPressing) {
    isPressing = true;
    pressStartTime = millis();
    shared_lastButtonActivity = millis();
  }

  // 2. FLANCO DE SUBIDA (Detectar que se ha soltado)
  if (!currentState && isPressing) {
    isPressing = false;
    
    // Calculamos cuánto duró la pulsación
    unsigned long duration = millis() - pressStartTime;

    // 3. CLASIFICACIÓN DEL EVENTO
    if (duration < DEBOUNCE_MS) {
      //Cogemos el mutex para leer globalButtonState y modificarlo si hace falta (TaskDisplay tambien lo puede modificar)
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        // Fue ruido, no hacemos nada
        globalButtonState = NO_PRESS; 
        xSemaphoreGive(buttonStateMutex);
      }
    } 
    else if (duration < LONG_PRESS_MS) {
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        globalButtonState = SHORT_PRESS; 
        xSemaphoreGive(buttonStateMutex);
      }
    } 
    else {
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        globalButtonState = LONG_PRESS; 
        xSemaphoreGive(buttonStateMutex);
      }
    }
  }
}
