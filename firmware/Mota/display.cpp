#include "storage.h"
#include "lora_node.h"
#include "WString.h"
#include "display.h"
#include "HT_SSD1306Wire.h"
#include "images.h"

static SSD1306Wire display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED);

// Internal button logic variables
unsigned long pressStartTime = 0;
bool isPressing = false;

bool isOledInitialized = false;
unsigned long lastButtonActivity = 0;

void initializeOled(bool showAnimation) {
  display.init();
  display.setFont(ArialMT_Plain_10);
  
  if (showAnimation) {
    display.clear();
    display.drawXbm(0, 5, image_width, image_height, (const unsigned char *)image_bits);
    display.display();
    delay(2500);

    for (int counter = 0; counter < 500; counter++) {
      display.clear();
      display.setTextAlignment(TEXT_ALIGN_LEFT);
      display.drawString(0, 0, String("Initializing FLoRa Node..."));

      int progress = (counter / 5) % 100;
      display.drawProgressBar(0, 38, 120, 10, progress);
      counter++;

      display.setTextAlignment(TEXT_ALIGN_CENTER);
      display.drawString(64, 25, String(progress) + "%");
      display.display();
      delay(20);
    }
  }
  
  display.setTextAlignment(TEXT_ALIGN_LEFT);
  isOledInitialized = true;
}

void checkButton() {
  bool btnState = (digitalRead(BUTTON_PIN) == LOW);

  if (btnState && !isPressing) {
    isPressing = true;
    pressStartTime = millis();
    lastButtonActivity = millis();
    
    if (!isOledInitialized) {
      initializeOled(false);
    }
  }

  if (!btnState && isPressing) {
    isPressing = false;
    unsigned long duration = millis() - pressStartTime;

    if (duration < DEBOUNCE_MS) {
      globalButtonState = NO_PRESS;
    } else if (duration < LONG_PRESS_MS) {
      globalButtonState = SHORT_PRESS;
      needDisplayUpdate = true;
    } else {
      globalButtonState = LONG_PRESS;
      needDisplayUpdate = true;
    }
  }
}

void handleNetworkSelectionMenu() {
  display.clear();
  display.setTextAlignment(TEXT_ALIGN_LEFT);
  display.drawString(0, 0, "== SELECT NETWORK ==");

  if (foundNetworks.empty()) {
    display.drawString(0, 20, "There are no networks :(");
    Serial.println("No se encontraron redes. (manual)");
    display.display();
    delay(2000);
    lastSleepTime = millis();
    currentState = STATE_SLEEP;
    needDisplayUpdate = true;
    return;
  }

  if (globalButtonState == SHORT_PRESS) {
    selectedNetworkIndex++;
    if (selectedNetworkIndex >= foundNetworks.size()) {
      selectedNetworkIndex = 0;
    }
    globalButtonState = NO_PRESS;
  }

  if (globalButtonState == LONG_PRESS) {
    selectedNW = foundNetworks[selectedNetworkIndex];
    memcpy(currentNetwork, selectedNW.info.SSID, SSID_LENGTH);
    Radio.SetChannel(channelList[selectedNW.channel]);

    display.clear();
    display.drawString(35, 25, "[Connecting]");

    if(!selectedNW.info.isPublic){
      display.drawString(25, 50, "May take 1-3 min");
    }
    display.display();
    delay(3500);

    globalButtonState = NO_PRESS;
    currentState = STATE_START_JOIN;
    return;
  }

  const int ITEMS_PER_PAGE = 4;
  int startList = 0;

  if (selectedNetworkIndex >= ITEMS_PER_PAGE) {
    startList = selectedNetworkIndex - (ITEMS_PER_PAGE - 1);
  }

  for (int i = 0; i < ITEMS_PER_PAGE; i++) {
    int currentIndex = startList + i;
    if (currentIndex >= foundNetworks.size()) break;

    int yPos = 15 + (i * 12);
    String linea = String(foundNetworks[currentIndex].info.SSID);
    linea += " (" + String(foundNetworks[currentIndex].rssi) + ")";
    linea += " [CH:" + String(foundNetworks[currentIndex].channel) + "]";

    int textWidth = display.getStringWidth(linea);
    int iconX = 1 + textWidth + 5;
    int iconY = yPos + 2;

    const unsigned char *icono_actual = foundNetworks[currentIndex].info.isPublic ? icon_unlock : icon_lock;

    if (currentIndex == selectedNetworkIndex) {
      display.setColor(WHITE);
      display.fillRect(0, yPos, 128, 12);
      display.setColor(BLACK);
      display.drawString(1, yPos, linea);
      display.drawXbm(iconX, iconY, emoji_width, emoji_height, icono_actual);
      display.setColor(WHITE);
    } else {
      display.drawString(1, yPos, linea);
      display.drawXbm(iconX, iconY, emoji_width, emoji_height, icono_actual);
    }
  }
  display.display();
}

void updateOled(humData &myHumData, GpsData &myGpsData, batteryStatus &senderBattery) {

  if (globalButtonState == SHORT_PRESS) {
    defaultMenu++;
    needDisplayUpdate = true;
    if (defaultMenu > 6) defaultMenu = 0;
    globalButtonState = NO_PRESS;
  }

  if(globalButtonState == LONG_PRESS){
    if(defaultMenu == 4){
      Serial.println("El ususario ha activado el escaneo de redes desde la oled");
      display.clear();
      display.drawString(40, 15, "[Scaning]");
      display.drawString(20, 35, "[Please be patient]");
      display.display();
      delay(2000);

      sendNodeLeaving();
      startLeavingState = millis();
      currentState = STATE_LEAVING_NETWORK;
    }else if(defaultMenu == 5){
      Serial.println("El ususario ha activado el refresco de coordenadas desde la oled");
      display.clear();
      display.drawString(30, 15, "[Updating GPS]");
      display.drawString(20, 35, "[Please be patient]");
      display.display();

      clearGpsConfig();

      if (getGpsCoordinates(myGpsData, GPS_TIMEOUT)) {
        Serial.println(F("[ÉXITO] Coordenadas obtenidas correctamente:"));
        saveGpsConfig();
      } else {
        Serial.println(F("[ERROR] Timeout: No se pudo fijar la ubicación GPS a tiempo."));
      }
      lastButtonActivity = millis(); //Para que no se vaya a dormir cuando acabe de leer el gps
      needDisplayUpdate = true;
    }else if(defaultMenu == 6){
      Serial.println("El ususario ha activado la lectura de humedad de forma manual");
      display.clear();
      display.drawString(40, 15, "[Reading]");
      display.drawString(20, 35, "[Please be patient]");
      display.display();
      delay(2000);
      
      myHumData = {0};
      readHum(myHumData);
      needDisplayUpdate = true; 
    }
    globalButtonState = NO_PRESS;
  }

  if (defaultMenu == 0 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 1/7");

    if (selectedNW.info.router != 0) {
      if(selectedNW.connected){
        display.drawString(0, 10, "Connected: " + String(currentNetwork));
      }else{
        display.drawString(0, 10, "Connecting: " + String(currentNetwork));
      }
      display.drawString(0, 20, "RSSI: " + String(lastRssi) + "| SNR: " + String(lastSnr));
      display.drawString(0, 30, "ID: " + String(MY_NODE_ID) + " | R_ID: " + String(selectedNW.info.router) + " | [CH:" + String(selectedNW.channel) + "]");
    } else {
      display.drawString(0, 30, "ID: " + String(MY_NODE_ID));
      display.drawString(0, 10, "Not Conected");
    }

    display.drawString(0, 40, "TX: " + String(sendedPackets) + " | RX: " + String(receivedPackets));

    String estadoStr = "";
    if (currentState == STATE_RX_JOIN) estadoStr = "Wait Join";
    else if (currentState == STATE_RX_DATA) estadoStr = "Wait ACK";
    else if (currentState == STATE_SLEEP) estadoStr = "Sleeping";
    else estadoStr = "Scaning...   [CH:" + String(scaningChanel) + "]";
    display.drawString(0, 50, "State: " + estadoStr);

    display.display();
    needDisplayUpdate = false;
  } else if (defaultMenu == 1 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 2/7");
    display.drawString(0, 10, "Rx_err: " + String(rx_err) + "| CRC: " + String(crc_err));
    display.drawString(0, 20, "Tx_err: " + String(tx_err));
    display.drawString(0, 30, "ChannelBusyErrors: " + String(channelBusyErrors));
    display.drawString(0, 40, "MissingAckErrors: " + String(missingAckErrors));
    display.drawString(0, 50, "Crypto_err: " + String(crypto_err));
    display.display();
    needDisplayUpdate = false;
  } else if (defaultMenu == 2 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 3/7");
    display.drawString(0, 10, "SendInterval: " + String(((float)sendInterval / 1000) / 60) + " min");
    display.drawString(0, 20, "AllowPublicConn: " + String(allowPublicConn == 0 ? "False" : "True"));
    display.drawString(0, 30, "Config Version: " + String(version) + ".0");
    display.display();
    needDisplayUpdate = false;
  } else if (defaultMenu == 3 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 4/7");
    display.drawString(0, 10, "Bat: " + String(senderBattery.batteryPercentage) + "% | raw: "+ String(senderBattery.realVoltage) + "v");

    if(myHumData.isValid){
      display.drawString(0, 20, "Hum: " + String(myHumData.percentage) + "% | raw: "+ String(myHumData.rawValue));
    }else{
      display.drawString(0, 20, "Hum: FAIL");
    }
    
    if (myGpsData.isValid) {
      display.drawString(0, 30, "GPS: OK | SAT: " + String(myGpsData.satellites));
      display.drawString(0, 40, "Lat: " + String(myGpsData.latitude, 6));
      display.drawString(0, 50, "Long: " + String(myGpsData.longitude, 6));
    } else {
      display.drawString(0, 30, "GPS: FAIL");
    }
    display.display();
    needDisplayUpdate = false;
  } else if (defaultMenu == 4 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 5/7");
    display.drawString(20, 10, "[NETWORK SCAN]");
    display.drawString(0, 25, "Long Press to scan");
    
    if (selectedNW.info.router != 0) {
      display.drawString(0, 50, "Connected: " + String(currentNetwork));
    } else {
      display.drawString(0, 50, "Not Connected");
    }
    display.display();
    needDisplayUpdate = false;
  }else if (defaultMenu == 5 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 6/7");
    display.drawString(30, 10, "[UPDATE GPS]");
    display.drawString(0, 25, "Long Press to get GPS");

    if (myGpsData.isValid) {
      display.drawString(0, 50, "GPS: OK | SAT: " + String(myGpsData.satellites));
    }else {
      display.drawString(0, 50, "GPS: FAIL");
    }
    display.display();
    needDisplayUpdate = false;
  }else if (defaultMenu == 6 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 7/7");
    display.drawString(30, 10, "[UPDATE HUM]");
    display.drawString(0, 25, "Long Press to read hum");

    if(myHumData.isValid){
      display.drawString(0, 50, "Hum: " + String(myHumData.percentage) + "% | raw: "+ String(myHumData.rawValue));
    }else{
      display.drawString(0, 50, "Hum: FAIL");
    }
    display.display();
    needDisplayUpdate = false;
  }
}

void showAlertOled(String msg){
  if(isOledInitialized){
    display.clear();
    display.setTextAlignment(TEXT_ALIGN_CENTER);
    String fullMsg = "[" + msg + "]";
    
    int textWidth = display.getStringWidth(fullMsg);
    
    if (textWidth <= 120) {
      display.drawString(60, 25, fullMsg);
    } else {
      String remainingMsg = fullMsg;
      String lines[4]; 
      int numLines = 0;
      
      while (remainingMsg.length() > 0 && numLines < 4) {
        if (display.getStringWidth(remainingMsg) <= 120) {
          lines[numLines++] = remainingMsg;
          break;
        }
        
        int splitIdx = remainingMsg.length();
        while (splitIdx > 0 && display.getStringWidth(remainingMsg.substring(0, splitIdx)) > 120) {
          splitIdx--;
        }
        
        int lastSpace = remainingMsg.lastIndexOf(' ', splitIdx);
        if (lastSpace > 0 && lastSpace > (splitIdx / 2)) {
          splitIdx = lastSpace;
        }
        
        lines[numLines++] = remainingMsg.substring(0, splitIdx);
        remainingMsg = remainingMsg.substring(splitIdx);
        remainingMsg.trim(); 
      }
      
      int yStart = 25 - ((numLines - 1) * 7); 
      for (int i = 0; i < numLines; i++) {
        int yPos = yStart + (i * 14);
        if (yPos > 50) yPos = 50; 
        display.drawString(60, yPos, lines[i]);
      }
    }
    
    display.display();
    delay(2000);
    display.setTextAlignment(TEXT_ALIGN_LEFT); 
    needDisplayUpdate = true; //Para que desaparezca el cuadro de alerta y se pinte lo que toque
  }
}
