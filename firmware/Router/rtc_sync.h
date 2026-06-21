// rtc_sync.h
// Módulo de reloj software para el router.
//
// El ESP32 no dispone de un RTC con batería de respaldo. Este módulo
// implementa un reloj basado en millis() que se calibra periódicamente
// con la hora del backend (NTP). Mientras no se calibre, rtcSyncNow()
// devuelve 0, indicando que la hora es desconocida.
//
// Thread-safety: todas las funciones usan statsMutex internamente.

#pragma once
#include <Arduino.h>

/// Inicializa el módulo de reloj (llamar en setup(), tras crear statsMutex).
void rtcSyncInit();

/// Calibra el reloj con un epoch Unix recibido del backend.
/// @param unixEpoch Segundos desde 1970-01-01 00:00:00 UTC.
void rtcSyncCalibrate(uint32_t unixEpoch);

/// Devuelve el epoch Unix actual estimado, o 0 si nunca se calibró.
uint32_t rtcSyncNow();

/// Devuelve true si el reloj ha sido calibrado al menos una vez.
bool rtcSyncIsValid();
