//SerialAM.cpp

#include "SerialAM.h"

SerialAM::SerialAM(HardwareSerial& hwSerial, uint8_t pin) 
    : serial(hwSerial), mosfetPin(pin), state(AMState::OFF), rxBuffer("") {
    onStatusChange = nullptr;
    onSendCompleted = nullptr;
}

void SerialAM::begin(uint32_t baud, int rxPin, int txPin) {
    // Configuración del pin de control de energía
    pinMode(mosfetPin, OUTPUT);
    digitalWrite(mosfetPin, LOW); // Por seguridad, arrancamos apagados

    // Inicializamos el puerto UART Hardware
    serial.begin(baud, SERIAL_8N1, rxPin, txPin);
    
    // Pre-reservamos algo de memoria para el buffer y evitar fragmentación
    rxBuffer.reserve(512); 
}

void SerialAM::setCallbacks(StatusCallback statusCb, SendCallback sendCb) {
    onStatusChange = statusCb;
    onSendCompleted = sendCb;
}

void SerialAM::changeState(AMState newState) {
    state = newState;
    stateTimer = millis(); // Reseteamos el temporizador para los Timeouts
}

void SerialAM::powerOn() {
    if (state == AMState::OFF || state == AMState::ERROR) {
        Serial.println("[SerialAM] Encendiendo hardware AM-036...");
        digitalWrite(mosfetPin, HIGH);
        rxBuffer = ""; // Limpiamos cualquier basura en el buffer
        changeState(AMState::WAITING_READY);
    }
}

void SerialAM::powerOff() {
    Serial.println("[SerialAM] Apagando hardware AM-036...");
    digitalWrite(mosfetPin, LOW);
    rxBuffer = "";
    changeState(AMState::OFF);
}

bool SerialAM::sendBigPacket(const String& jsonPayload) {
    // Cláusula de Guarda: Proteger contra envíos indebidos
    if (state != AMState::IDLE) {
        Serial.println("[SerialAM] Error: Intento de envío mientras no estaba IDLE.");
        return false; 
    }

    Serial.println("[SerialAM] Transfiriendo payload al AM-036...");
    
    // Construimos el comando localmente y lo enviamos
    serial.print("{\"cmd\":\"SEND\",\"data\":");
    serial.print(jsonPayload);
    serial.print("}\n"); // El salto de línea final es CRÍTICO
    
    changeState(AMState::WAITING_SEND);
    return true;
}

void SerialAM::update() {
    // 1. LECTURA DE EVENTOS (No bloqueante)
    while (serial.available()) {
        char c = serial.read();
        if (c == '\n') {
            // Fin de trama detectado, procesamos el JSON
            processIncomingJSON(rxBuffer);
            rxBuffer = ""; // Vaciamos buffer para el siguiente mensaje
        } else if (c != '\r') {
            rxBuffer += c; // Acumulamos el caracter
        }
    }

    // 2. GESTIÓN DE TIMEOUTS DE SEGURIDAD (Vigilancia de hardware)
    switch (state) {
        case AMState::WAITING_READY:
            // Dar hasta 60 segundos para arrancar y encontrar red celular (a veces GPRS es lento)
            if (millis() - stateTimer > 60000) {
                Serial.println("[SerialAM] TIMEOUT CRÍTICO: El módulo no consiguió red en 60s.");
                changeState(AMState::ERROR); // Lo mandamos a error. El Router decidirá si apaga o reintenta.
                if (onStatusChange) onStatusChange(false, 0);
            }
            break;

        case AMState::WAITING_SEND:
            // Dar hasta 40 segundos para que el servidor backend responda al POST HTTP
            if (millis() - stateTimer > 40000) {
                Serial.println("[SerialAM] TIMEOUT CRÍTICO: El servidor HTTP no respondió.");
                changeState(AMState::IDLE); // Volvemos a IDLE por si queremos reintentar
                
                // Creamos un documento vacío para avisar al callback del fallo
                JsonDocument emptyDoc; 
                if (onSendCompleted) onSendCompleted(false, 408, emptyDoc); // 408 = Request Timeout
            }
            break;

        default:
            break;
    }
}

void SerialAM::processIncomingJSON(const String& jsonStr) {
    // ArduinoJson v7: JsonDocument gestiona la memoria dinámica por nosotros
    JsonDocument doc; 
    DeserializationError error = deserializeJson(doc, jsonStr);

    if (error) {
        Serial.print("[SerialAM] Error de Parseo JSON desde AM-036: ");
        Serial.println(error.c_str());
        Serial.println("[SerialAM] Payload corrupto recibido: " + jsonStr);
        return;
    }

    // Identificamos si es un Evento (del AM-036) o una Respuesta (a un comando)
    String event = doc["event"];

    // --- PROCESAMIENTO DE EVENTOS ---
    if (event == "READY") {
        int csq = doc["csq"] | 0; // Leemos la cobertura, por defecto 0 si no viene
        Serial.printf("[SerialAM] << Evento READY recibido (CSQ: %d)\n", csq);
        
        changeState(AMState::IDLE); 
        if (onStatusChange) onStatusChange(true, csq);
    } 
    else if (event == "LOST_NETWORK") {
        Serial.println("[SerialAM] << Evento LOST_NETWORK recibido");
        changeState(AMState::ERROR);
        if (onStatusChange) onStatusChange(false, 0);
    }
    else if (event == "SEND_DONE") {
        bool ok = doc["ok"];
        int code = doc["code"];
        Serial.printf("[SerialAM] << Evento SEND_DONE recibido (HTTP: %d)\n", code);
        
        changeState(AMState::IDLE);
        if (onSendCompleted) onSendCompleted(ok, code, doc); // Pasamos el documento completo para extraer el "conf" downlink
    }
    else {
        Serial.println("[SerialAM] Evento JSON desconocido: " + event);
    }
}