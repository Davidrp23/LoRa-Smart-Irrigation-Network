//Libraries for LoRa
#include <SPI.h>
#include <LoRa.h>

//Libraries for OLED Display
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

//define the pins used by the LoRa transceiver module
#define SCK 5
#define MISO 19
#define MOSI 27
#define SS 18
#define RST 14
#define DIO0 26

//433E6 for Asia
//866E6 for Europe
//915E6 for North America
#define BAND 866E6

//OLED pins
#define OLED_SDA 4
#define OLED_SCL 15 
#define OLED_RST 16
#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RST);

String LoRaData;


enum class messageType : uint8_t {
    // Mensajes de Control de Canal
    RTS = 0x10,      // Request To Send (Solicitud para enviar)
    CTS = 0x11,      // Clear To Send (Permiso para enviar)
    
    // Mensajes de Datos
    DATA = 0x20,     // Paquete que contiene la carga útil de datos
    DATA_ACK = 0x21, // Acknowledge (Confirmación) de recepción de DATA
    
    // Mensajes de Mantenimiento / Finalización
    NAK = 0x30,      // Negative Acknowledge (Error / No reconocido)
    FIN = 0x31,      // Finalizar la transmisión

    // --- Solicitud y Descubrimiento ---
    JOIN_REQUEST = 0x50,      // Solicitud de un nuevo nodo para unirse a la red.

    // --- Respuesta del Coordinador (Admision) / Gateway ---
    JOIN_ACCEPTED = 0x55,     // Respuesta del coordinador que acepta la solicitud. 
                              // Debe incluir información de configuración (ej. ID de red, clave).
    JOIN_DENIED = 0x56,       // Respuesta del coordinador que deniega la solicitud de unión.
    
    // --- Bloqueo y Mantenimiento ---
    NODE_BLOCKED = 0x60,      // Mensaje del coordinador para informar a un nodo que está bloqueado.
    NODE_LEAVING = 0x61,      // Mensaje de un nodo que desea salir de la red de forma controlada.
    
    // Default o desconocido
    INVALID = 0x00
};

#define MAX_PAYLOAD_SIZE 240 // Máximo de bytes para DATA

// Se usa __attribute__((packed)) para asegurar que el compilador no añada relleno (padding)
// entre los campos, garantizando que el struct tenga exactamente el tamaño esperado.
typedef struct __attribute__((packed)) {
    // 1. Tipo de Mensaje (1 Byte)
    messageType type; 
    
    // 2. Longitud de los datos (1 Byte) - Es vital para saber cuántos bytes son DATA real.
    uint8_t length; 
    
    // 3. Carga Útil (Máximo 240 Bytes)
    uint8_t data[MAX_PAYLOAD_SIZE];
    
    // 4. Checksum (2 Bytes) - Se recomienda CRC16
    uint16_t checksum; 
} LoRaMessage;

void setup() { 
  
  //reset OLED display via software
  pinMode(OLED_RST, OUTPUT);
  digitalWrite(OLED_RST, LOW);
  delay(20);
  digitalWrite(OLED_RST, HIGH);
  
  //initialize OLED
  Wire.begin(OLED_SDA, OLED_SCL);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3c, false, false)) { // Address 0x3C for 128x32
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }

  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0,0);
  display.print("LORA RECEIVER ");
  display.display();
  
  //initialize Serial Monitor
  Serial.begin(115200);

  Serial.println("LoRa Receiver Test");
  
  //SPI LoRa pins
  SPI.begin(SCK, MISO, MOSI, SS);
  //setup LoRa transceiver module
  LoRa.setPins(SS, RST, DIO0);

  if (!LoRa.begin(BAND)) {
    Serial.println("Starting LoRa failed!");
    while (1);
  }
  Serial.println("LoRa Initializing OK!");
  display.setCursor(0,10);
  display.println("LoRa Inicializacion OK!");
  display.display();  
}

// Asegúrate de que las definiciones de struct, enum y constantes 
// estén disponibles globalmente en el archivo del cliente.
// 
// typedef struct __attribute__((packed)) { ... } LoRaMessage;
// enum messageType { ... };
// #define MAX_PAYLOAD_SIZE ...



void loop() {

  // Intenta analizar el paquete
  int packetSize = LoRa.parsePacket();
  
  // Verifica si el paquete recibido tiene el tamaño esperado de la estructura
  if (packetSize == sizeof(LoRaMessage)) {
    
    // Declarar una variable para almacenar la estructura recibida
    LoRaMessage incomingMessage; 

    // Leer el paquete binario directamente en la estructura
    // Leemos el tamaño completo de la estructura en la dirección de memoria de incomingMessage
    // LoRa.readBytes() es ideal para datos binarios
    int bytesRead = LoRa.readBytes((uint8_t*)&incomingMessage, sizeof(LoRaMessage));
    
    // Verificación adicional: Asegurarse de que leímos todos los bytes
    if (bytesRead == sizeof(LoRaMessage)) {
      
      Serial.println("\n--- PAQUETE LORA RECIBIDO ---");
      
      // 1. Imprimir el Tipo de Mensaje (Type)
      Serial.print("1. Tipo (Enum): ");
      Serial.println((uint8_t)incomingMessage.type, HEX);
      
      // 2. Imprimir la Longitud de los Datos (Length)
      Serial.print("2. Longitud de datos (Bytes): ");
      Serial.println(incomingMessage.length);
      
      // 3. Imprimir los Datos (Payload)
      Serial.print("3. Datos (Payload): ");
      // Usamos LoRaData para mostrar el mensaje en el Serial y Display
      char payloadBuffer[MAX_PAYLOAD_SIZE + 1]; // +1 para el terminador nulo
      
      // Copiamos los datos del array interno de la estructura al buffer local
      // y nos aseguramos de no leer más de lo que la longitud indica.
      size_t actualLength = std::min((size_t)incomingMessage.length, (size_t)MAX_PAYLOAD_SIZE);
      memcpy(payloadBuffer, incomingMessage.data, actualLength);
      payloadBuffer[actualLength] = '\0'; // Asegurar terminador nulo
      
      String receivedData = String(payloadBuffer);
      Serial.println(receivedData);
      
      // 4. Imprimir el Checksum (sin verificación)
      Serial.print("4. Checksum (Recibido): 0x");
      Serial.println(incomingMessage.checksum, HEX);

      // 5. Imprimir el RSSI
      int rssi = LoRa.packetRssi();
      Serial.print("RSSI: ");    
      Serial.println(rssi);

      Serial.println("-----------------------------");

      // --- Actualizar Display ---
      // Usaremos la variable receivedData (el String extraído) para mostrar el mensaje.
      display.clearDisplay();
      display.setCursor(0,0);
      display.print("PAQUETE RECIBIDO");
      display.setCursor(0,20);
      display.print("T:");
      display.print((uint8_t)incomingMessage.type);
      display.print(" L:");
      display.print(incomingMessage.length);
      display.setCursor(0,30);
      display.print(receivedData); // Mostrar el mensaje
      display.setCursor(0,40);
      display.print("RSSI:");
      display.setCursor(30,40);
      display.print(rssi);
      display.display();   
      
    } else {
        Serial.println("Error: No se leyeron todos los bytes esperados.");
        // Si no se leyeron todos los bytes, se debe limpiar el buffer restante (si lo hay)
        while (LoRa.available()) {
            LoRa.read();
        }
    }
  } else if (packetSize > 0) {
      Serial.print("Paquete de tamaño incorrecto (");
      Serial.print(packetSize);
      Serial.print(" bytes). Esperado: ");
      Serial.print(sizeof(LoRaMessage));
      Serial.println(" bytes.");
      // Limpiar el buffer si el tamaño es incorrecto
      while (LoRa.available()) {
          LoRa.read();
      }
  }
}