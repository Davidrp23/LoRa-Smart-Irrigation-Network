#include "display.h"
#include "AMcontrol.h" // triggerManualBigPacket()
#include "HT_SSD1306Wire.h"
#include "config.h"
#include "gps.h"
#include "images.h"
#include "rtc_sync.h" // reloj software del router
#include "storage.h" // saveGpsConfig
#include <Wire.h>
#include <time.h>   // gmtime(), struct tm — para formatear epoch

static SSD1306Wire display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64,
                           RST_OLED);

// ---------------------------------------------------------------------------
// Semáforos / Mutexes (definidos aquí, declarados extern en display.h)
// ---------------------------------------------------------------------------
SemaphoreHandle_t statsMutex;
SemaphoreHandle_t buttonStateMutex;
SemaphoreHandle_t networkMutex;
SemaphoreHandle_t loraTxSemaphore;

// ---------------------------------------------------------------------------
// Variables compartidas protegidas por statsMutex
// ---------------------------------------------------------------------------
volatile size_t shared_rx = 0;
volatile size_t shared_tx = 0;
volatile size_t shared_rx_err = 0;
volatile size_t shared_tx_err = 0;
volatile int16_t shared_rssi = 0;
volatile size_t shared_queueFull = 0;
volatile uint8_t shared_queueSize = 0;
volatile uint8_t shared_waiting_conf = 0;
volatile uint16_t shared_channelBusyErrors = 0;
volatile int8_t shared_connectedClients = 0;
volatile size_t shared_crc_err = 0;
volatile size_t shared_crypto_err = 0;
size_t shared_lastClient = 0;
volatile int8_t shared_coverage = 0;
volatile TickType_t shared_firstPktTimestamp = 0;

// GPS y Fuel Gauge (ambas protegidas por statsMutex)
GpsData shared_gps = {0.0, 0.0, 0.0, 0, false};
BatteryStatus shared_battery = {0.0f, 0.0f, false};

// ---------------------------------------------------------------------------
// OLED UI / Botón
// ---------------------------------------------------------------------------
uint8_t defaultMenu = 0; // 0-5: seis menús

static unsigned long pressStartTime = 0;
static bool isPressing = false;
volatile ButtonEvent globalButtonState = NO_PRESS;
volatile unsigned long shared_lastButtonActivity = 0;
static bool isOledOn = true;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Formatea un epoch Unix (segundos UTC) como cadena "HH:MM:SS UTC".
 * Si epoch == 0 (reloj no calibrado) devuelve "--:--:-- (no sync)".
 * Usa gmtime() de <time.h>, que es thread-safe en ESP-IDF si se llama
 * con una copia local del epoch (no desde ISR).
 */
static String formatEpochToTime(uint32_t epoch) {
  if (epoch == 0) return "--:--:-- (no sync)";
  time_t t = (time_t)epoch;
  struct tm *tm_info = gmtime(&t); // UTC
  char buf[20];
  snprintf(buf, sizeof(buf), "%02d:%02d:%02d UTC",
           tm_info->tm_hour, tm_info->tm_min, tm_info->tm_sec);
  return String(buf);
}

// Muestra mensaje en pantalla y ejecuta una actualización GPS (bloqueante).
// Se llama desde TaskDisplay cuando el usuario hace LONG_PRESS en menú GPS.
static void handleGpsUpdate() {
  Serial.println(F("[GPS_R] Usuario solicitó actualización GPS desde OLED."));

  display.clear();
  display.setTextAlignment(TEXT_ALIGN_CENTER);
  display.drawString(64, 15, "[Updating GPS]");
  display.drawString(64, 32, "Please be patient");
  display.setTextAlignment(TEXT_ALIGN_LEFT);
  display.display();

  GpsData newGps;
  bool ok = routerGetGpsCoordinates(newGps, GPS_TIMEOUT);

  if (xSemaphoreTake(statsMutex, pdMS_TO_TICKS(200)) == pdTRUE) {
    shared_gps = newGps;
    xSemaphoreGive(statsMutex);
  }

  if (ok) {
    saveGpsConfig(newGps);
    Serial.println(F("[GPS_R] Coordenadas actualizadas y guardadas en flash."));
  } else {
    Serial.println(F("[GPS_R] Timeout: no se obtuvo fix GPS."));
  }

  // Evitar que la pantalla se apague nada más terminar
  shared_lastButtonActivity = millis();
}

// Solicita a am_manager_task el envío inmediato de un big-packet (no
// bloqueante). Se llama desde TaskDisplay cuando el usuario hace LONG_PRESS en
// menú Send BP.
static void handleManualBigPacket() {
  Serial.println(F("[DISPLAY] Usuario solicitó big-packet manual desde OLED."));

  display.clear();
  display.setTextAlignment(TEXT_ALIGN_CENTER);
  display.drawString(64, 15, "[Sending BigPkt]");
  display.drawString(64, 32, "AM module waking up");
  display.setTextAlignment(TEXT_ALIGN_LEFT);
  display.display();

  triggerManualBigPacket(); // Notificación FreeRTOS, retorna inmediatamente

  vTaskDelay(pdMS_TO_TICKS(1500)); // Dar tiempo visual al mensaje
  shared_lastButtonActivity = millis();
}

// ---------------------------------------------------------------------------
// Inicialización del OLED
// ---------------------------------------------------------------------------
void initializeOled() {
  display.init();
  display.setFont(ArialMT_Plain_10);
  display.clear();
  display.drawXbm(0, 5, image_width, image_height,
                  (const unsigned char *)image_bits);
  display.display();
  delay(2500);

  for (int counter = 0; counter < 500; counter++) {
    display.clear();
    display.setTextAlignment(TEXT_ALIGN_LEFT);
    display.drawString(0, 0, "Initializing FLoRa Router...");
    int progress = (counter / 5) % 100;
    display.drawProgressBar(0, 38, 120, 10, progress);
    counter++;
    display.setTextAlignment(TEXT_ALIGN_CENTER);
    display.drawString(64, 25, String(progress) + "%");
    display.display();
    delay(20);
  }
  display.setTextAlignment(TEXT_ALIGN_LEFT);
  shared_lastButtonActivity = millis();
}

// ---------------------------------------------------------------------------
// Tarea de pantalla (Core 0, prioridad 1)
// ---------------------------------------------------------------------------
void TaskDisplay(void *pvParameters) {

  DisplayStats local;

  for (;;) {

    // --- Leer y gestionar botón bajo mutex ---
    if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
      ButtonEvent evt = globalButtonState;

      if (evt == SHORT_PRESS && isOledOn) {
        defaultMenu++;
        if (defaultMenu > 7)
          defaultMenu = 0;
        globalButtonState = NO_PRESS;

      } else if (evt == LONG_PRESS && isOledOn) {
        globalButtonState = NO_PRESS;
        xSemaphoreGive(buttonStateMutex);

        if (defaultMenu == 5) {
          // === Menú 6/7: Actualizar GPS ===
          handleGpsUpdate();
        } else if (defaultMenu == 6) {
          // === Menú 7/7: Big-Packet manual ===
          handleManualBigPacket();
        }
        // Reiniciar bucle para repintar
        continue;
      }
      xSemaphoreGive(buttonStateMutex);
    }

    // --- Gestión de apagado por inactividad (30 s) ---
    if (millis() - shared_lastButtonActivity > 30000) {
      if (isOledOn) {
        display.displayOff();
        isOledOn = false;
      }
      vTaskDelay(pdMS_TO_TICKS(500));
      continue;
    } else {
      if (!isOledOn) {
        display.displayOn();
        isOledOn = true;
      }
    }

    // --- Copiar datos bajo mutex (sección crítica breve) ---
    if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
      local.rx_pkts = shared_rx;
      local.tx_pkts = shared_tx;
      local.rx_err = shared_rx_err;
      local.tx_err = shared_tx_err;
      local.last_client = shared_lastClient;
      local.last_rssi = shared_rssi;
      local.queueFull = shared_queueFull;
      local.queueSize = shared_queueSize;
      local.waiting_conf = shared_waiting_conf;
      local.channelBusyErrors = shared_channelBusyErrors;
      local.connectedClients = shared_connectedClients;
      local.crc_err = shared_crc_err;
      local.crypto_err = shared_crypto_err;
      local.version = version;
      local.coverage = shared_coverage;
      // GPS
      local.gpsLat = shared_gps.latitude;
      local.gpsLon = shared_gps.longitude;
      local.gpsSats = shared_gps.satellites;
      local.gpsValid = shared_gps.isValid;
      // Batería
      local.batPct = shared_battery.percentage;
      local.batVolt = shared_battery.voltage;
      local.batValid = shared_battery.isValid;
      xSemaphoreGive(statsMutex);
    }

    // --- Pintar pantalla ---
    display.clear();

    // Animación de vida (esquina inferior derecha)
    display.drawString(120, 55, (millis() / 1000) % 2 == 0 ? "." : "..");

    // -----------------------------------------------------------------------
    // Menú 0/8 — Red y tráfico LoRa
    // -----------------------------------------------------------------------
    if (defaultMenu == 0) {
      display.drawString(8, 0, "== FLoRa Router == 1/8");
      display.drawString(0, 12,
                         "ID: " + String(routerId) + " |" + String(SSID) +
                             " [CH:" + String((int)numChannel) + "]");
      display.drawString(0, 23,
                         "TX: " + String(local.tx_pkts) +
                             " | Err: " + String(local.tx_err));
      display.drawString(0, 34,
                         "RX: " + String(local.rx_pkts) +
                             " | Err: " + String(local.rx_err));
      display.drawString(0, 45,
                         "RSSI: " + String(local.last_rssi) +
                             " | RXID: " + String(local.last_client));
      // Candado público/privado
      if (isPublic) {
        display.drawXbm(120, 12, emoji_width, emoji_height, icon_unlock);
      } else {
        display.drawXbm(120, 12, emoji_width, emoji_height, icon_lock);
      }

      // -----------------------------------------------------------------------
      // Menú 1/8 — Cola y errores
      // -----------------------------------------------------------------------
    } else if (defaultMenu == 1) {
      display.drawString(8, 0, "== FLoRa Router == 2/8");
      display.drawString(0, 12, "Mote Data Q : " + String(local.queueSize));
      display.drawString(0, 23, "Data Ovflw  : " + String(local.queueFull));
      display.drawString(0, 34, "Conf Pend   : " + String(local.waiting_conf));
      display.drawString(0, 45,
                         "ChanBusy    : " + String(local.channelBusyErrors));

      // -----------------------------------------------------------------------
      // Menú 2/8 — Clientes y seguridad
      // -----------------------------------------------------------------------
    } else if (defaultMenu == 2) {
      display.drawString(8, 0, "== FLoRa Router == 3/8");
      display.drawString(0, 12,
                         "Clients     : " + String(local.connectedClients));
      display.drawString(0, 23, "Crypto Err  : " + String(local.crypto_err));
      display.drawString(0, 34, "CRC Errors  : " + String(local.crc_err));
      display.drawString(0, 45,
                         "Version     : " + String(local.version) + ".0");

      // -----------------------------------------------------------------------
      // Menú 3/8 — Batería + cobertura GPRS
      // -----------------------------------------------------------------------
    } else if (defaultMenu == 3) {
      display.drawString(8, 0, "== FLoRa Router == 4/8");

      if (local.batValid) {
        // Línea 1: porcentaje y voltaje
        String batLine = "Bat: " + String(local.batPct, 1) + "% | " +
                         String(local.batVolt, 2) + "V";
        display.drawString(0, 12, batLine);
      } else {
        display.drawString(0, 12, "Bat: ---");
        display.drawString(0, 23, "(Fuel gauge no init)");
      }
      // Línea 3: cobertura GPRS (aprovechamos el hueco)
      display.drawString(0, 34, "GPRS CSQ    : " + String(local.coverage));

      // -----------------------------------------------------------------------
      // Menú 4/8 — Información GPS
      // -----------------------------------------------------------------------
    } else if (defaultMenu == 4) {
      display.drawString(8, 0, "== FLoRa Router == 5/8");

      if (local.gpsValid) {
        display.drawString(0, 12, "GPS: OK | SAT: " + String(local.gpsSats));
        display.drawString(0, 23, "Lat: " + String(local.gpsLat, 6));
        display.drawString(0, 34, "Lon: " + String(local.gpsLon, 6));
      } else {
        display.drawString(0, 12, "GPS: NO FIX");
        display.drawString(0, 25, "Go to menu 6/7");
        display.drawString(0, 36, "to update GPS");
      }

      // -----------------------------------------------------------------------
      // Menú 5/8 — Actualizar GPS (acción LONG_PRESS)
      // -----------------------------------------------------------------------
    } else if (defaultMenu == 5) {
      display.drawString(8, 0, "== FLoRa Router == 6/8");
      display.setTextAlignment(TEXT_ALIGN_CENTER);
      display.drawString(64, 14, "[ UPDATE GPS ]");
      display.drawString(64, 27, "Long Press to refresh");
      display.setTextAlignment(TEXT_ALIGN_LEFT);

      if (local.gpsValid) {
        display.drawString(0, 45, "GPS: OK | SAT: " + String(local.gpsSats));
      } else {
        display.drawString(0, 45, "GPS: NO FIX");
      }

      // -----------------------------------------------------------------------
      // Menú 6/8 — Enviar Big-Packet manual (acción LONG_PRESS)
      // -----------------------------------------------------------------------
    } else if (defaultMenu == 6) {
      display.drawString(8, 0, "== FLoRa Router == 7/8");
      display.setTextAlignment(TEXT_ALIGN_CENTER);
      display.drawString(64, 14, "[ SEND BIG PKT ]");
      display.drawString(64, 27, "Long Press to send");
      display.setTextAlignment(TEXT_ALIGN_LEFT);
      display.drawString(0, 45, "Q: " + String(local.queueSize) + " motes");

      // -----------------------------------------------------------------------
      // Menú 7/8 — Reloj interno del router
      // -----------------------------------------------------------------------
    } else if (defaultMenu == 7) {
      display.drawString(8, 0, "== FLoRa Router == 8/8");

      uint32_t nowEpoch = rtcSyncNow(); // Llama directamente (protege su mutex)
      bool valid = rtcSyncIsValid();

      if (valid) {
        // Línea de tiempo completa HH:MM:SS
        display.drawString(0, 12, "UTC: " + formatEpochToTime(nowEpoch));
        // Fecha
        time_t t = (time_t)nowEpoch;
        struct tm *tmi = gmtime(&t);
        char datebuf[16];
        snprintf(datebuf, sizeof(datebuf), "%04d-%02d-%02d",
                 tmi->tm_year + 1900, tmi->tm_mon + 1, tmi->tm_mday);
        display.drawString(0, 23, "Date: " + String(datebuf));
        display.drawString(0, 34, "Epoch: " + String(nowEpoch));
        display.drawString(0, 45, "Status: [SYNCED]");
      } else {
        display.setTextAlignment(TEXT_ALIGN_CENTER);
        display.drawString(64, 14, "Clock: NOT SYNCED");
        display.drawString(64, 27, "Send BigPkt to");
        display.drawString(64, 39, "calibrate clock");
        display.setTextAlignment(TEXT_ALIGN_LEFT);
      }

    } // fin del bloque if/else if de menús

    display.display();
    vTaskDelay(pdMS_TO_TICKS(200));
  }
}

// ---------------------------------------------------------------------------
// Gestión del botón (llamar desde loop())
// ---------------------------------------------------------------------------
void checkButton() {
  bool currentState = (digitalRead(BUTTON_PIN) == LOW);
  //Serial.printf("Estado del boton: %d\n", currentState);

  if (currentState && !isPressing) {
    isPressing = true;
    pressStartTime = millis();
    shared_lastButtonActivity = millis();
  }

  if (!currentState && isPressing) {
    isPressing = false;
    unsigned long duration = millis() - pressStartTime;

    if (duration < DEBOUNCE_MS) {
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        globalButtonState = NO_PRESS;
        xSemaphoreGive(buttonStateMutex);
      }
    } else if (duration < LONG_PRESS_MS) {
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        globalButtonState = SHORT_PRESS;
        xSemaphoreGive(buttonStateMutex);
      }
    } else {
      if (xSemaphoreTake(buttonStateMutex, (TickType_t)10) == pdTRUE) {
        globalButtonState = LONG_PRESS;
        xSemaphoreGive(buttonStateMutex);
      }
    }
  }
}
