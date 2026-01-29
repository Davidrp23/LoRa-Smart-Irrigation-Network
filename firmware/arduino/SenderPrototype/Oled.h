//Oled.h

// 1. Libraries
#include <Wire.h>               
#include "HT_SSD1306Wire.h"
//--
#include "Types.h"

void initializeOled();
void showOled(senderStatus sender);