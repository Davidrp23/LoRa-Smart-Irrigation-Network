#pragma once
#include <Arduino.h>
#include <Preferences.h>
#include "config.h"

void initRouterStorage();
void saveRouterConfig();
void loadRouterConfig();
void clearRouterConfig();
