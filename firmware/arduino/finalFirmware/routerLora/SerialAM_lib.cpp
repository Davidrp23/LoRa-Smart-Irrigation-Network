// SerialAM_lib.cpp
// Implementación del driver AM-036.
// Toda la comunicación con la tarea de control se realiza vía TaskNotify
// (sin callbacks, sin flags globales, sin polling desde fuera).

#include "SerialAM_lib.h"

// ---------------------------------------------------------------------------
// Timeouts de seguridad
// ---------------------------------------------------------------------------
static constexpr unsigned long TIMEOUT_READY_MS = 60000UL; // 60 s para conseguir red GPRS
static constexpr unsigned long TIMEOUT_SEND_MS  = 40000UL; // 40 s para respuesta HTTP

// ---------------------------------------------------------------------------
// Constructor e inicialización
// ---------------------------------------------------------------------------
SerialAM::SerialAM(HardwareSerial& hwSerial, uint8_t mosfetPin)
    : _serial(hwSerial),
      _mosfetPin(mosfetPin),
      _state(AMState::OFF),
      _stateTimer(0),
      _rxBuffer(""),
      _controlTask(nullptr)
{
    _lastResult = {false, 0, ""};
}

void SerialAM::begin(uint32_t baud, int rxPin, int txPin) {
    pinMode(_mosfetPin, OUTPUT);
    digitalWrite(_mosfetPin, LOW); // Seguridad: arrancamos apagados

    _serial.begin(baud, SERIAL_8N1, rxPin, txPin);
    _rxBuffer.reserve(512); // Pre-reservamos para evitar fragmentación de heap
}

void SerialAM::setControlTask(TaskHandle_t taskHandle) {
    _controlTask = taskHandle;
}

// ---------------------------------------------------------------------------
// Control de energía
// ---------------------------------------------------------------------------
void SerialAM::powerOn() {
    if (_state == AMState::OFF || _state == AMState::ERROR) {
        Serial.println(F("[AM] Encendiendo AM-036..."));
        _rxBuffer = "";
        digitalWrite(_mosfetPin, HIGH);
        changeState(AMState::WAITING_READY);
    }
}

void SerialAM::powerOff() {
    Serial.println(F("[AM] Apagando AM-036..."));
    digitalWrite(_mosfetPin, LOW);
    _rxBuffer = "";
    changeState(AMState::OFF);
}

// ---------------------------------------------------------------------------
// Envío del BigPacket
// ---------------------------------------------------------------------------
bool SerialAM::sendBigPacket(const String& jsonPayload) {
    if (_state != AMState::IDLE) {
        Serial.println(F("[AM] Error: sendBigPacket() llamado fuera de estado IDLE."));
        return false;
    }

    Serial.println(F("[AM] Transfiriendo BigPacket al AM-036..."));

    // Protocolo: {"cmd":"SEND","data":<payload>}\n
    _serial.print(F("{\"cmd\":\"SEND\",\"data\":"));
    _serial.print(jsonPayload);
    _serial.print(F("}\n")); // Salto de línea es el delimitador de trama

    changeState(AMState::WAITING_SEND);
    return true;
}

// ---------------------------------------------------------------------------
// Loop de lectura UART + watchdog de timeouts (llamar desde loop o tarea)
// ---------------------------------------------------------------------------
void SerialAM::update() {
    // --- 1. Lectura de UART (no bloqueante) ---
    while (_serial.available()) {
        char c = _serial.read();
        if (c == '\n') {
            if (_rxBuffer.length() > 0) {
                processFrame(_rxBuffer);
            }
            _rxBuffer = "";
        } else if (c != '\r') {
            _rxBuffer += c;
        }
    }

    // --- 2. Timeouts de seguridad ---
    switch (_state) {
        case AMState::WAITING_READY:
            if (millis() - _stateTimer > TIMEOUT_READY_MS) {
                Serial.println(F("[AM] TIMEOUT: El módulo no obtuvo red en 60s."));
                changeState(AMState::ERROR);
                notify(AM_NOTIFY_ERROR);
            }
            break;

        case AMState::WAITING_SEND:
            if (millis() - _stateTimer > TIMEOUT_SEND_MS) {
                Serial.println(F("[AM] TIMEOUT: El servidor HTTP no respondió en 40s."));
                _lastResult = {false, 408, ""};
                changeState(AMState::IDLE); // Volvemos a IDLE para permitir reintento
                notify(AM_NOTIFY_SEND_FAIL);
            }
            break;

        default:
            break;
    }
}

// ---------------------------------------------------------------------------
// Helpers privados
// ---------------------------------------------------------------------------
void SerialAM::changeState(AMState newState) {
    _state = newState;
    _stateTimer = millis();
}

void SerialAM::notify(uint32_t bits) {
    if (_controlTask == nullptr) return;

    // xTaskNotify es seguro llamarlo desde cualquier contexto no-ISR.
    // Si se necesitase llamar desde ISR real, usar xTaskNotifyFromISR().
    xTaskNotify(_controlTask, bits, eSetBits);
}

void SerialAM::processFrame(const String& jsonStr) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, jsonStr);

    if (err) {
        Serial.printf("[AM] Error parseo JSON: %s | Raw: %s\n",
                      err.c_str(), jsonStr.c_str());
        return;
    }

    const char* event = doc["event"] | "";

    // -----------------------------------------------------------------------
    // Eventos del AM-036
    // -----------------------------------------------------------------------
    if (strcmp(event, "READY") == 0) {
        int csq = doc["csq"] | 0;
        Serial.printf("[AM] << READY (CSQ: %d)\n", csq);
        changeState(AMState::IDLE);
        notify(AM_NOTIFY_READY);
    }
    else if (strcmp(event, "LOST_NETWORK") == 0) {
        Serial.println(F("[AM] << LOST_NETWORK"));
        changeState(AMState::ERROR);
        notify(AM_NOTIFY_ERROR);
    }
    else if (strcmp(event, "SEND_DONE") == 0) {
        bool ok     = doc["ok"]   | false;
        int  code   = doc["code"] | 0;
        Serial.printf("[AM] << SEND_DONE (ok=%d, HTTP %d)\n", ok, code);

        _lastResult.ok       = ok;
        _lastResult.httpCode = code;
        _lastResult.responseBody = "";

        // Serializamos el campo "response" si existe (downlink del servidor)
        if (doc.containsKey("response")) {
            serializeJson(doc["response"], _lastResult.responseBody);
        }

        changeState(AMState::IDLE);
        notify(ok ? AM_NOTIFY_SEND_OK : AM_NOTIFY_SEND_FAIL);
    }
    else {
        Serial.printf("[AM] Evento desconocido: %s\n", event);
    }
}