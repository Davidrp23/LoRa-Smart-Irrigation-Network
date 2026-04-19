#include "storage.h"

Preferences routerPrefs;

void initRouterStorage() {
  loadRouterConfig();
}

void saveRouterConfig() {
  routerPrefs.begin("router_conf", false);
  routerPrefs.putChar("nChan", numChannel);
  routerPrefs.putBool("isPub", isPublic);
  routerPrefs.putString("ssid", String(SSID));
  routerPrefs.putUShort("ver", version);
  routerPrefs.end();
}

void loadRouterConfig() {
  routerPrefs.begin("router_conf", true);
  if (routerPrefs.isKey("ver")) {
    numChannel = routerPrefs.getChar("nChan", numChannel);
    isPublic = routerPrefs.getBool("isPub", isPublic);
    String savedSSID = routerPrefs.getString("ssid", String(SSID));
    savedSSID.toCharArray(SSID, SSID_LENGTH);
    version = routerPrefs.getUShort("ver", version);
    
    // Recalcular el canal en base al numero de canal cargado
    if (numChannel >= 0 && numChannel < NUM_CHANELS) {
        channel = channelList[numChannel];
    }
  }
  routerPrefs.end();
}

void clearRouterConfig() {
  routerPrefs.begin("router_conf", false);
  routerPrefs.clear();
  routerPrefs.end();
}
