#ifndef SERIAL_AM_H
#define SERIAL_AM_H

#include <Arduino.h>
#include <ArduinoJson.h>

// Definición de los estados del módulo
enum class AMState {
    OFF,            // MOSFET apagado, módulo sin energía
    WAITING_READY,  // MOSFET encendido, esperando a que el AM-036 consiga red (Evento READY)
    IDLE,           // Módulo conectado a red y libre para enviar datos
    WAITING_SEND,   // Paquete enviado al AM-036, esperando respuesta HTTP (Evento SEND_DONE)
    ERROR           // Estado de fallo (pérdida de red o hardware colgado)
};

// Definición de las firmas de los Callbacks
typedef void (*StatusCallback)(bool isReady, int csq);
typedef void (*SendCallback)(bool ok, int httpCode, JsonDocument& responseDoc);

class SerialAM {
private:
    HardwareSerial& serial;
    uint8_t mosfetPin;
    AMState state;
    unsigned long stateTimer;
    String rxBuffer;

    // Punteros a las funciones (Callbacks)
    StatusCallback onStatusChange;
    SendCallback onSendCompleted;

    // Métodos internos
    void processIncomingJSON(const String& jsonStr);
    void changeState(AMState newState);

public:
    // Constructor (Inyección de dependencias)
    SerialAM(HardwareSerial& hwSerial, uint8_t pin);

    // Inicialización
    void begin(uint32_t baud, int rxPin, int txPin);
    
    // Función central: Debe llamarse en cada ciclo del loop() principal
    void update(); 

    // Acciones de control de energía
    void powerOn();
    void powerOff();

    // Enviar datos al AM-036 (Solo funciona si está IDLE)
    bool sendBigPacket(const String& jsonPayload);

    // Getters y Setters
    AMState getState() { return state; }
    void setCallbacks(StatusCallback statusCb, SendCallback sendCb);
};

#endif // SERIAL_AM_H