// SerialAM_lib.h
// Librería de bajo nivel para comunicar con el módulo AM-036 vía UART.
// Gestiona la máquina de estados del módulo y notifica eventos a la tarea
// de control mediante TaskNotify (sin polling, sin flags globales).

#pragma once

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <Arduino.h>
#include <ArduinoJson.h>

// ---------------------------------------------------------------------------
// Bits de notificación (TaskNotify) que la librería envía a la tarea de control
// ---------------------------------------------------------------------------
// Bit 0 → AM listo para enviar (READY con red GPRS)
// Bit 1 → Envío HTTP completado con éxito (ok == true)
// Bit 2 → Error: pérdida de red o timeout
// Bit 3 → Envío HTTP completado con error (ok == false)
// Bit 4 → Hay un nuevo job urgente en la cola (despertar tarea)
// Bit 5 → Big-packet disparado manualmente desde OLED
#define AM_NOTIFY_READY (1UL << 0)
#define AM_NOTIFY_SEND_OK (1UL << 1)
#define AM_NOTIFY_ERROR (1UL << 2)
#define AM_NOTIFY_SEND_FAIL (1UL << 3)
#define AM_NOTIFY_NEW_JOB (1UL << 4)
#define AM_NOTIFY_MANUAL_BP (1UL << 5)

// ---------------------------------------------------------------------------
// Estado interno del módulo AM-036
// ---------------------------------------------------------------------------
enum class AMState : uint8_t {
  OFF,           // MOSFET apagado, módulo sin energía
  WAITING_READY, // Esperando evento READY (módulo buscando red GPRS)
  IDLE,          // Módulo con red y libre para enviar
  WAITING_SEND,  // Paquete enviado, esperando respuesta HTTP
  ERROR          // Fallo (pérdida de red o timeout no recuperado)
};

// ---------------------------------------------------------------------------
// Resultado del último envío HTTP (accessible desde la tarea de control)
// ---------------------------------------------------------------------------
struct AMSendResult {
  bool ok;
  int httpCode;
  String responseBody; // Campo "response" deserializado como string JSON
};

// ---------------------------------------------------------------------------
// Clase SerialAM — driver del AM-036
// ---------------------------------------------------------------------------
class SerialAM {
public:
  // Constructor: inyección de dependencias
  //   hwSerial  → puerto UART hardware (p.ej. Serial1)
  //   mosfetPin → pin GPIO que controla el GATE del MOSFET
  SerialAM(HardwareSerial &hwSerial, uint8_t mosfetPin);

  // Inicialización: configura UART y pin MOSFET (llamar desde setup())
  void begin(uint32_t baud, int rxPin, int txPin);

  // Registra la tarea FreeRTOS que recibirá las TaskNotifications de eventos
  void setControlTask(TaskHandle_t taskHandle);

  // Enciende el módulo (MOSFET ON → espera evento READY)
  void powerOn();

  // Apaga el módulo (MOSFET OFF → estado OFF)
  void powerOff();

  // Envía el BigPacket JSON al AM-036.
  // Solo tiene efecto en estado IDLE. Retorna false si no estaba listo.
  bool sendBigPacket(const String &jsonPayload);

  // Envía una petición GET al AM-036 con la ruta indicada.
  // Solo tiene efecto en estado IDLE. Retorna false si no estaba listo.
  bool sendGetRequest(const String &path);

  // Debe llamarse periódicamente (en loop o tarea dedicada) para:
  //   - Leer bytes del UART y detectar tramas JSON completas
  //   - Verificar timeouts de seguridad
  void update();

  // Getters
  AMState getState() const { return _state; }
  AMSendResult getLastResult() const { return _lastResult; }
  int8_t getLastCsq() const { return _lastCsq; }

private:
  HardwareSerial &_serial;
  uint8_t _mosfetPin;
  uint32_t _baud; // Baud rate guardado para reabrir UART en powerOn()
  int _rxPin;     // Pin RX guardado para reabrir/cerrar UART
  int _txPin;     // Pin TX guardado para reabrir/cerrar UART
  AMState _state;
  unsigned long _stateTimer;
  String _rxBuffer;
  TaskHandle_t _controlTask; // Handle de la tarea a notificar
  AMSendResult _lastResult;
  int8_t _lastCsq; // Último valor CSQ (cobertura GPRS) recibido

  // Cambia estado y resetea el temporizador de timeout
  void changeState(AMState newState);

  // Parsea una trama JSON completa recibida del AM-036
  void processFrame(const String &jsonStr);

  // Envía una notificación FreeRTOS a la tarea de control (ISR-safe via
  // xTaskNotify)
  void notify(uint32_t bits);
};