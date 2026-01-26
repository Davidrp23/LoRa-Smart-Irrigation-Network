//Battery.cpp

#include "Arduino.h"
#include "Battery.h"

// --------------------------------Batery parameters--------------------------------

// Pin de medición de batería (con divisor 100k/47k)
const int V_BAT_PIN = 13; 
// Pin para leer el USB 5V (con divisor 100k/47k)
const int USB_DETECT_PIN = 12; 

// CALIBRACIÓN POR PUNTOS (Para corregir la no-linealidad)
// PUNTOS DE REFERENCIA CALIBRADOS EN ADC
const int ADC_BAT_MIN = 1104; // ADC a 3.30V real (0%)
const int ADC_BAT_MAX = 1400; // ADC a 4.19V real (100% de reposo)

// Voltajes Li-ion (para el mapeo de porcentaje)
const int V_MIN_MAP = 330; // 3.30V * 100
const int V_MAX_MAP = 419; // 4.20V * 100

const int BATERY_MEASURE_ITERATIONS = 200;

//------------------------------------------------------------------------------------

batteryStatus checkBatteryStatus(){

  batteryStatus status;
  int adcVal = 0;

  // --- 1. MEDICIÓN DE VOLTAJE ---  Se hacen varios para usar el promedio, ya que hay fluctuaciones.
  delay(50);
  for(int i=0; i<BATERY_MEASURE_ITERATIONS; i++){
    adcVal += analogRead(V_BAT_PIN);
    delay(1);
  }

  adcVal = adcVal/BATERY_MEASURE_ITERATIONS;

  // --- 2. DETECCIÓN DE ESTADO (Por Pin USB) ---
  int usbState = analogRead(USB_DETECT_PIN);
  bool isCharging = (usbState >= 400); // USB CONECTADO (se usa bool para claridad)
  
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
  status.isCharging=isCharging;
  status.isCharged=(realVoltage >= 4.2);
  status.realVoltage=realVoltage;
  status.adcValue=adcVal;

  return status;
  
}
