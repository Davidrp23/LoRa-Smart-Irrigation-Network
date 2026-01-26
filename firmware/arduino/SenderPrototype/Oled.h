//Oled.h

// 1. Libraries
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
//--
#include "Types.h"

// 2. OLED parameters
#define OLED_SDA 4
#define OLED_SCL 15 
#define OLED_RST 16
#define SCREEN_WIDTH 128 
#define SCREEN_HEIGHT 64 

#define MAX_CHARGE_ANIM_STEPS 5

void initializeOled();
void showOled(senderStatus sender);