//Battery.cpp

#include "Arduino.h"
#include "Battery.h"

// --------------------------------Batery parameters--------------------------------

// Pin de medición de batería
const int V_BAT_PIN = 1; 

// Voltajes Li-ion (para el mapeo de porcentaje)
const int V_MIN_MAP = 330; // 3.30V * 100
const int V_MAX_MAP = 419; // 4.20V * 100

const int BATERY_MEASURE_ITERATIONS = 50;

//const float EXPERIMENTAL_FACTOR = 0.;

//------------------------------------------------------------------------------------

batteryStatus checkBatteryStatus(){

  batteryStatus status;
  float milliVolts = 0;

  // --- 1. MEDICIÓN DE VOLTAJE ---  Se hacen varios para usar el promedio, ya que hay fluctuaciones.
  delay(50);
  for(int i=0; i<BATERY_MEASURE_ITERATIONS; i++){
    milliVolts += analogReadMilliVolts(V_BAT_PIN);;
    delay(10);
  }

  milliVolts = milliVolts/BATERY_MEASURE_ITERATIONS;
  milliVolts = (float) (milliVolts * 490 ) / 100.0; // Factor de calibracion datasheet del fabricante

  // --- CÁLCULO DE VOLTAJE Y PORCENTAJE ---
  float realVoltage = (float)milliVolts / 1000.0;
  realVoltage = (realVoltage * 0.441) + 2.32; // correccion y = mx + b
  
  float voltageForMapping = realVoltage;
  if (voltageForMapping > V_MAX_MAP/100.0) {
    voltageForMapping = V_MAX_MAP/100.0; // Limita el voltaje al máximo mapeado
  }
  
  int currentPercentage = map((int)(voltageForMapping * 100), V_MIN_MAP, V_MAX_MAP, 0, 100);
  if (currentPercentage > 100) currentPercentage = 100; 
  if (currentPercentage < 0) currentPercentage = 0; 
  
  status.batteryPercentage=currentPercentage;
  status.realVoltage=realVoltage;

  return status;
  
}
