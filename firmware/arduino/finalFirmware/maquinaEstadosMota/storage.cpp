#include "storage.h"

RTC_DATA_ATTR uint16_t receivedPackets = 0;
RTC_DATA_ATTR uint16_t sendedPackets = 0;
RTC_DATA_ATTR int16_t lastRssi = 0;
RTC_DATA_ATTR uint16_t rx_err = 0;
RTC_DATA_ATTR uint16_t tx_err = 0;
RTC_DATA_ATTR uint16_t channelBusyErrors = 0;
RTC_DATA_ATTR uint16_t missingAckErrors = 0;
RTC_DATA_ATTR uint16_t crypto_err = 0;
RTC_DATA_ATTR uint32_t join_cnt = 0;

RTC_DATA_ATTR int8_t changeRouterAttempts = 7;
RTC_DATA_ATTR int8_t TXattempts = 3;
RTC_DATA_ATTR int8_t RXattempts = 3;

ScannedNetwork selectedNW = { 0 };
char currentNetwork[SSID_LENGTH] = {0};
uint16_t version = 0;
size_t sendInterval = 30000;
int8_t allowPublicConn = 1;
GpsData myGpsData = {0};

Preferences preferences;

void initStorage() {
  loadNetworkConfig();
  loadNodeConfig();
  loadGpsConfig();
  loadJoinCnt();
}

void saveNetworkConfig() {
  preferences.begin("mota_net", false);
  preferences.putBytes("selectedNW", &selectedNW, sizeof(ScannedNetwork));
  preferences.putString("currentNetwork", String(currentNetwork));
  preferences.end();
}

void loadNetworkConfig() {
  preferences.begin("mota_net", true);
  if (preferences.isKey("selectedNW")) {
    preferences.getBytes("selectedNW", &selectedNW, sizeof(ScannedNetwork));
    String net = preferences.getString("currentNetwork", "");
    net.toCharArray(currentNetwork, SSID_LENGTH);
  }
  preferences.end();
}

void clearNetworkConfig() {
  preferences.begin("mota_net", false);
  preferences.clear();
  preferences.end();
  selectedNW = {0};
  memset(currentNetwork, 0, SSID_LENGTH);
}

void saveNodeConfig() {
  preferences.begin("mota_conf", false);
  preferences.putUShort("version", version);
  preferences.putUInt("sendInterval", sendInterval);
  preferences.putChar("allowPub", allowPublicConn);
  preferences.end();
}

void loadNodeConfig() {
  preferences.begin("mota_conf", true);
  version = preferences.getUShort("version", 0);
  sendInterval = preferences.getUInt("sendInterval", 30000);
  allowPublicConn = preferences.getChar("allowPub", 1);
  preferences.end();
}

void saveGpsConfig() {
  preferences.begin("mota_gps", false);
  preferences.putBytes("myGpsData", &myGpsData, sizeof(GpsData));
  preferences.end();
}

void loadGpsConfig() {
  preferences.begin("mota_gps", true);
  if (preferences.isKey("myGpsData")) {
    preferences.getBytes("myGpsData", &myGpsData, sizeof(GpsData));
  }
  preferences.end();
}

void clearGpsConfig() {
  preferences.begin("mota_gps", false);
  preferences.remove("myGpsData");
  preferences.end();
  myGpsData = {0};
}

void saveJoinCnt() {
  preferences.begin("mota_sec", false);
  preferences.putUInt("join_cnt", join_cnt);
  preferences.end();
}

void loadJoinCnt() {
  preferences.begin("mota_sec", true);
  join_cnt = preferences.getUInt("join_cnt", 0);
  preferences.end();
}
