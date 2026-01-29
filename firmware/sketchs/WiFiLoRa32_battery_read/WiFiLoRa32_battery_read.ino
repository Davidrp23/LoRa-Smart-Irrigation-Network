/*  
  ADC read voltage via GPIO1 simple test.
  Base on Wi_Fi LoRa 32 V3.2
  by Aaron.Lee from HelTec AutoMation, ChengDu, China
  成都惠利特自动化科技有限公司
  www.heltec.cn
*/

#include <Wire.h>               
#include "HT_SSD1306Wire.h"

static SSD1306Wire  display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED); // addr , freq , i2c group , resolution , rst

struct batteryStatus {
  int adcValue;
  float realVoltage;
  int batteryPercentage;
};

// --------------------------------Batery parameters--------------------------------

// Pin de medición de batería (con divisor 100k/47k)
const int V_BAT_PIN = 1; 

// CALIBRACIÓN POR PUNTOS (Para corregir la no-linealidad)
// PUNTOS DE REFERENCIA CALIBRADOS EN ADC
const int ADC_BAT_MIN = 1104; // ADC a 3.30V real (0%)
const int ADC_BAT_MAX = 1400; // ADC a 4.19V real (100% de reposo)

// Voltajes Li-ion (para el mapeo de porcentaje)
const int V_MIN_MAP = 330; // 3.30V * 100
const int V_MAX_MAP = 419; // 4.20V * 100

const int BATERY_MEASURE_ITERATIONS = 50;

//------------------------------------------------------------------------------------

batteryStatus checkBatteryStatus(){

  batteryStatus status;
  int adcVal = 0;

  // --- 1. MEDICIÓN DE VOLTAJE ---  Se hacen varios para usar el promedio, ya que hay fluctuaciones.
  delay(50);
  for(int i=0; i<BATERY_MEASURE_ITERATIONS; i++){
    adcVal += analogRead(V_BAT_PIN);
    delay(10);
  }

  adcVal = adcVal/BATERY_MEASURE_ITERATIONS;

  // --- CÁLCULO DE VOLTAJE Y PORCENTAJE ---
  int realVoltageRaw = map(adcVal, ADC_BAT_MIN, ADC_BAT_MAX, V_MIN_MAP, V_MAX_MAP);
  float realVoltage = (float)realVoltageRaw / 100.0;
  
  float voltageForMapping = realVoltage;
  if (voltageForMapping > V_MAX_MAP/100.0) {
      voltageForMapping = V_MAX_MAP/100.0; // Limita el voltaje al máximo mapeado
  }
  
  int currentPercentage = map((int)(voltageForMapping * 100), V_MIN_MAP, V_MAX_MAP, 0, 100);
  if (currentPercentage > 100) currentPercentage = 100; 
  if (currentPercentage < 0) currentPercentage = 0; 
  
  
  status.batteryPercentage=currentPercentage;
  status.realVoltage=realVoltage;
  status.adcValue=adcVal;

  return status;
  
}

void VextON(void)
{
  pinMode(Vext,OUTPUT);
  digitalWrite(Vext, LOW);
}

void VextOFF(void) //Vext default OFF
{
  pinMode(Vext,OUTPUT);
  digitalWrite(Vext, HIGH);
}

void setup() {
  // Initialize serial communication at 115200 bits per second:
  Serial.begin(115200);

  // Set the resolution of the analog-to-digital converter (ADC) to 12 bits (0-4095):
  analogReadResolution(12);

  // Set pin 37 as an output pin (used for ADC control):
  pinMode(37, OUTPUT);

  // Set pin 37 to HIGH (enable ADC control):
  digitalWrite(37, HIGH);

  VextON();
  delay(100);

  // Initialising the UI will init the display too.
  display.init();

  display.setFont(ArialMT_Plain_10);

}

void loop() {
  //batteryStatus bs = checkBatteryStatus();
  int analogVolts = analogReadMilliVolts(1);

  display.clear();
  display.setFont(ArialMT_Plain_10);
  display.drawString(0, 0, "Lectura Bateria:");
  display.setFont(ArialMT_Plain_16);
  display.drawString(0, 15, String((float)(analogVolts * 490 / 100)/1000) + " V");
  display.drawString(0, 30, String(analogRead(1)) + " adc");
  
  display.display();

  delay(1000);
}