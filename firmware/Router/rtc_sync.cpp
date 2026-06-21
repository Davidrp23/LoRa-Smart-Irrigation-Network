// rtc_sync.cpp
// Implementación del reloj software del router.
//
// Funcionamiento:
//   - Al calibrar, se guarda el epoch de referencia y el valor de millis()
//     en ese instante.
//   - rtcSyncNow() calcula la hora actual como:
//       referenceEpoch + (millis() - referenceMillis) / 1000
//   - millis() es monotónico y tiene resolución de 1 ms; su drift típico
//     en un ESP32 (~20 ppm) equivale a ~1.7s/día, por lo que las
//     recalibraciones periódicas desde el backend lo compensan.
//
// Overflow de millis():
//   millis() es uint32_t y desborda a 0 cada ~49.7 días.
//   La operación (millis() - s_referenceMillis) es SEGURA ante overflow
//   porque la resta de enteros sin signo en C++ está definida como
//   aritmética módulo 2^32. Ejemplo:
//     millis()=5 (post-overflow), s_referenceMillis=0xFFFFFF00 →
//     resultado = 0x105 = 261 ms  ← correcto.
//   El único requisito es que el tiempo transcurrido desde la última
//   calibración sea < 49.7 días, lo cual se garantiza con las
//   recalibraciones periódicas del backend (máx. cada 12h en producción).
//
// Overflow de epoch Unix (uint32_t):
//   El epoch en segundos desborda en el año 2106. No es un problema
//   práctico para este proyecto.

#include "rtc_sync.h"
#include "display.h" // statsMutex

// --- Estado interno (protegido por statsMutex) ---
static uint32_t s_referenceEpoch  = 0; // Epoch Unix de la última calibración
static uint32_t s_referenceMillis = 0; // millis() en el momento de calibración
static bool     s_calibrated      = false;

void rtcSyncInit() {
  // No hay hardware que inicializar; simplemente nos aseguramos de que
  // el estado es coherente por si se llama más de una vez.
  if (xSemaphoreTake(statsMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    s_referenceEpoch  = 0;
    s_referenceMillis = 0;
    s_calibrated      = false;
    xSemaphoreGive(statsMutex);
  }
  Serial.println(F("[RTC_SYNC] Módulo de reloj inicializado (sin calibrar)."));
}

void rtcSyncCalibrate(uint32_t unixEpoch) {
  if (unixEpoch == 0) return; // Protección contra valores nulos

  if (xSemaphoreTake(statsMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
    s_referenceEpoch  = unixEpoch;
    s_referenceMillis = millis();
    s_calibrated      = true;
    xSemaphoreGive(statsMutex);
  }
  Serial.printf("[RTC_SYNC] Reloj calibrado → epoch=%u\n", unixEpoch);
}

uint32_t rtcSyncNow() {
  uint32_t result = 0;

  if (xSemaphoreTake(statsMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    if (s_calibrated) {
      // Tiempo transcurrido desde la calibración (en segundos)
      uint32_t elapsed = (millis() - s_referenceMillis) / 1000;
      result = s_referenceEpoch + elapsed;
    }
    xSemaphoreGive(statsMutex);
  }

  return result;
}

bool rtcSyncIsValid() {
  bool valid = false;

  if (xSemaphoreTake(statsMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    valid = s_calibrated;
    xSemaphoreGive(statsMutex);
  }

  return valid;
}
