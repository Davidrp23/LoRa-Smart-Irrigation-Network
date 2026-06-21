#include "storage.h"
#include "display.h"  // shared_gps

Preferences routerPrefs;
static Preferences gpsPrefs;

void initRouterStorage() {
  loadRouterConfig();
  // Cargar GPS persistido si existe
  GpsData storedGps;
  if (loadGpsConfig(storedGps)) {
    shared_gps = storedGps;
    Serial.printf("[STORAGE] GPS cargado: lat=%.6f lon=%.6f\n",
                  storedGps.latitude, storedGps.longitude);
  }
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

// ---------------------------------------------------------------------------
// Persistencia GPS (namespace independiente "router_gps")
// ---------------------------------------------------------------------------
void saveGpsConfig(const GpsData &gps) {
  gpsPrefs.begin("router_gps", false);
  gpsPrefs.putDouble("lat",   gps.latitude);
  gpsPrefs.putDouble("lon",   gps.longitude);
  gpsPrefs.putDouble("alt",   gps.altitude);
  gpsPrefs.putUInt("sats",    gps.satellites);
  gpsPrefs.putBool("valid",   gps.isValid);
  gpsPrefs.end();
}

bool loadGpsConfig(GpsData &gps) {
  gpsPrefs.begin("router_gps", true);
  bool hasData = gpsPrefs.isKey("lat");
  if (hasData) {
    gps.latitude   = gpsPrefs.getDouble("lat",  0.0);
    gps.longitude  = gpsPrefs.getDouble("lon",  0.0);
    gps.altitude   = gpsPrefs.getDouble("alt",  0.0);
    gps.satellites = gpsPrefs.getUInt("sats",   0);
    gps.isValid    = gpsPrefs.getBool("valid",  false);
  }
  gpsPrefs.end();
  return hasData;
}

void clearGpsConfig() {
  gpsPrefs.begin("router_gps", false);
  gpsPrefs.clear();
  gpsPrefs.end();
}
