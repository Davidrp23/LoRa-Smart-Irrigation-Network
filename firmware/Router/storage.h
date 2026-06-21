#pragma once
#include <Arduino.h>
#include <Preferences.h>
#include "config.h"
#include "types.h"   // GpsData

void initRouterStorage();
void saveRouterConfig();
void loadRouterConfig();
void clearRouterConfig();

// Persistencia GPS
void saveGpsConfig(const GpsData &gps);
bool loadGpsConfig(GpsData &gps);
void clearGpsConfig();
