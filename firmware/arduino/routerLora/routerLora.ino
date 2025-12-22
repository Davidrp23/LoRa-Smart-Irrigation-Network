//Libraries for LoRa
#include <SPI.h>
#include <LoRa.h>

//Libraries for OLED Display
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include <set>

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

//DEFINIR CANAL MAS ADELANTE

//OLED pins
#define OLED_SDA 4
#define OLED_SCL 15 
#define OLED_RST 16
#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels

TaskHandle_t routerLoopTaskHandle = NULL;

const double MODULE_ID = 0; // Indicara el ID entre todos los productos de riego a nivel global, esto se hace para asociar el router o producto con la cuenta del usuario dentro de la plataforma
                         // Los clientes del router tambien tendran una ID como esta

struct ClientInfo {
  int direction;         // Dirección interna dentro de la red LoRa, se usa para calcular los marcos temporales de cada dispositivo en la RED (Definido mas adelante)
  unsigned long lastConection; // Timestamp de la última conexión/actividad  --> IMPORTANTE!!! : Cuando se tengan los modulos DS1302 ,reemplazar por la fecha exacta de la ultima conexion
};

std::unordered_map<double, ClientInfo> conectedClients; //Mapa donde la clave es el identificador global del cliente y el valor su informacion
std::set<double> blockedClients; //Set donde guardaremos todos los clientes que el router o el usuario haya decidido bloquear

String msg = "";
double receivedPackages = 0;
double sentPackcages = 0;
double erroredPackages = 0;


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


// Función de CRC-16/CCITT-FALSE (una implementación común)
uint16_t calculateChecksum(const uint8_t* buf, size_t len) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < len; i++) {
    crc ^= (uint16_t)buf[i] << 8;
    for (int j = 0; j < 8; j++) {
      if (crc & 0x8000)
        crc = (crc << 1) ^ 0x1021; // Polinomio CRC-16/CCITT
      else
        crc <<= 1;
    }
  }
  return crc;
}


LoRaMessage makePackage(messageType type, String data){

  LoRaMessage msg;

  const char* data_c_str = data.c_str();

  msg.type = type;
  msg.length = strlen(data_c_str);

  //Copiar los datos del String al array data[]
  //Aseguramos que no exceda el MAX_PAYLOAD_SIZE
  memcpy(msg.data, data_c_str, std::min((size_t)msg.length, (size_t)MAX_PAYLOAD_SIZE));

  // El tamaño a calcular el checksum es todo el struct menos el campo checksum
  size_t checksum_area_size = sizeof(LoRaMessage) - sizeof(uint16_t);

  // 1. Calcular y asignar el Checksum
  msg.checksum = calculateChecksum((const uint8_t*)&msg, checksum_area_size);

  return msg;
}


Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RST);

void IRAM_ATTR onReceive(int packetSize);

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
  display.print("LORA ROUTER ");
  display.display();
  
  //initialize Serial Monitor
  Serial.begin(115200);
  
  Serial.println("Iniciando Router");

  //SPI LoRa pins
  SPI.begin(SCK, MISO, MOSI, SS);
  //setup LoRa transceiver module
  LoRa.setPins(SS, RST, DIO0);
  
  if (!LoRa.begin(BAND)) {
    Serial.println("Starting LoRa failed!");
    while (1);
  }
  Serial.println("LoRa Inicializacion OK!");
  display.setCursor(0,10);
  display.print("Inicializacion OK!");
  display.display();
  delay(2000);

  routerLoopTaskHandle = xTaskGetCurrentTaskHandle(); //En el contexto de Arduino sobre ESP32, tanto setup() como loop() pertenecen a la misma tarea
  
  LoRaMessage incomingPacket;

  LoRaMessage outgoingPacket;

  //Por defecto, el router solo estara a la escucha, nunca enviara un mensaje a la mota (ya que esta en deep sleep), sera esta ultima cuando despierte, la que inicie la comunicacion hacia el router

  LoRa.onReceive(onReceive); //Configuramos a la funcion onRecibe como callback cuando se reciba un paquete, usa el pin dio0 para configurar una interrupcion
  LoRa.receive(); // Ponemos el router en modo escucha 

}

/* 

-- MODO DE OPERACION ROUTER LORA --

  Un Router puede recibir los siguientes paquetes:

    RTS -> Un nodo pide permiso para trasmitir 

    DATA -> Un nodo envia informacion recolectada

    NAK -> La respuesta que envio el router se recibio corrupta o no se pudo procesar en la mota por cualquier motivo

    FIN -> Un nodo da por finalizada la comunicacion con el router

    JOIN_REQUEST -> Un nodo quiere unirse a la Red

    NODE_LEAVING -> Un nodo se va de la Red
  
  
  Un Router puede enviar los siguientes paquetes:

    CTS -> Se envia al cliente para indicarle que tiene el canal libre para trasmitir, hasta entonces espera.
    
    DATA_ACK -> Le indica al cliente que el dato que ha enviado se ha recibido correctamente
    
    NAK -> Le indica al cliente que el mensaje que envio esta corrupto o malformado (por ejemplo cuando el checksum no coincide) y que debe enviarlo de nuevo
    
    JOIN_ACCEPTED -> Le indica al cliente que ahora es parte de la red
    
    JOIN_DENIED -> Le indica al cliente que por algun motivo no se le admite en la red (porque esta llena por ejemplo)
    
    NODE_BLOCKED -> Le informa al cliente que esta en la lista negra del router y por ende no sera admitido (poruque el usuario desde la plataforma lo haya bloqueado)
    
    INVALID -> Se usa para indicar que el mensaje es invalido o no tiene sentido (pero no es por un error de trasmision, no indica malformacion o corrupcion en el paquete)

  

  -Una vez conectado:

    Cada nodo o mota (dispositivo que manda informacion de la humedad de la tierra) contacta con el router periodicamente, segun el marco temporal que se le asigne.
    El router (este dispositivo) enciende el AM-036 para pasarle la informacion de la mota para que lo envie usando datos moviles (de momento, el router solo imprimira el dato por serie)
    Una vez que el AM-036 reciba la respuesta del servidor pasara la misma al router y el router a la mota con un DATA_ACK/INVALID. 
    
    Puede que al servidor cuando se le contacte, devuelva su respuesta junto a configuraciones para las motas o para el router. 
    Por ejemplo, si el usuario ha hecho cambios en los ajustes de la motas, como cambiar la periodicidad de los datos o bloquear motas de la red. Estos cambios se envian cuando se contacta
    con el servidor y no cuando se hacen en tiempo real ya que las motas y el AM-036 permanecen en deep-sleep la mayoria del tiempo por motivos de ahorro energetico.

  
  -Marco temporal y colisiones:
    El marco temporal va en relacion con la identificacion interna del nodo en la red.
    Cada nodo cuando se conecta recibe el numero que ocupa, por ejemplo el 10.
    
    El usuario elige cada cuanto tiempo quiere que las motas recolecten informacion sobre la humedad, y el router le dira a cada mota cuando le tiene que entregar informacion.
    Este tiempo se calcula segun la identificacion interna de cada nodo y sera distinto para cada uno, con el fin de minimizar al maximo la posibilidad de que colisionen los paquetes.

    Pongamos que el usuario quiere que los nodos envien informacion cada 6h, entonces, las horas de trasmision serian:

    00:00 , 06:00, 12:00, 18:00

    Pongamos que son las 00:00, para que todos los nodos envien la informacion sin colisionar, en una red de 4 nodos (pequeña para el ejemplo) el router calcularia el tiempo de trasmision para todos los nodos,
    que seria algo asi:

    00:00 - 00:02 -> Nodo 1
    00:02 - 00:03 -> Nodo 2
    00:03 - 00:04 -> Nodo 3
    00:04 - 00:05 -> Nodo 4

    Para coordinar los nodos, el router le enviara a cada nodo las horas a las que tiene que trasmitir y este ultimo grabara en su DS1302 las alarmas para provocar interrupciones a esas horas, esto con el fin de
    hacerlo lo mas preciso posible. (Aun el DS1302 no esta instalado)

    Al delay de cada nodo con respecto a la hora de actualizacion elegida por el usario lo llamamos marco temporal -> para el nodo 4 en este ejemplo serian de 4 minutos

    Se sabe que los DS1302, con el tiempo, tienen errores de varios minutos ya que se van descalibrando con el tiempo.
    Esto depende en gran medida de la calidad y el estado del modulo.
    Para mitigar este efecto, el router en cada mensaje con las motas adjuntara la hora real (que corrije con el servidor central a traves del AM-036).
    Cuando una mota detecte una desviacion de algunos minutos en su reloj, reprogramara su hora con la del router, que es la misma para todos. 
    Esto es muy importante ya que tenemos un sistema con un medio compartido (canal LoRa) y para minimizar las colisiones, el sistema requiere de la hora exacta.
    Para minimizar las colisiones, las parcelas adyacentes deberan usar canales distintos.



*/


void loop() {
  // put your main code here, to run repeatedly:

  if (ulTaskNotifyTake(pdTRUE, portMAX_DELAY) == 1) {

    //Obtenemos el paquete: (devuelve messageType::INVALID en el struct si hubo un problema al formar el paquete recivido)
    LoRaMessage incomingPackage = receivePacket();

    //Procesamos el paquete: (contestamos si es preciso)
    process(incomingPackage);

    delay(500);
    
  }
}

void process(LoRaMessage incomingPackage){

  switch(incomingPackage.type){

    //Para no formar bucles infinitos, el nodo y el router tendran 3 ciclos para completar la comunicacion, en caso de 3 fallos reiterados se cancelara la comunicacion

    case messageType::RTS : // El nodo solicita permiso para enviar, se le envia CLS si el canal esta libre o nada si esta ocupado 
      break;

    case messageType::DATA : // El nodo adjunta datos recolectado por sus sensores
      break;

    case messageType::FIN : // El nodo termina la comunicacion 
      break;

    case messageType::INVALID : // El mensaje recivido por el nodo es invalido --> Enviamos NAK para que lo envie de nuevo
      break;

    case messageType::JOIN_REQUEST : // El nodo solicita unirse a la red gestionada por este router, aceptamos o denegamos empleando las cabeceras adecuadas
      break;

    case messageType::NAK : // El nodo envia NAK, lo que quiere decir que el ultimo mensaje que enviamos estaba malformado o se corrompio por el camino, lo enviamos de nuevo.
      break;

    case messageType::NODE_LEAVING : //El nodo solicita salirse de la Red que gestiona este router, el router envia messageType::FIN para aceptar la salida del nodo y terminar la comunicacion
      break;

    default: // Caso no esperado, enviamos NAK para que lo envie de nuevo (posible corrupcion?)
      break;

  }

}

LoRaMessage receivePacket(){
  
  // Define el tamaño mínimo de un paquete (Headers sin payload, 4B):
  const size_t MIN_PACKET_SIZE = sizeof(messageType) + sizeof(uint8_t) + sizeof(uint16_t); // 4 bytes (messageType, length, checksum)

  // Intenta analizar el paquete
  int packetSize = LoRa.parsePacket();
  
  // 1. Verificar si se recibió un paquete y si es, al menos, el tamaño mínimo.
  if (packetSize >= MIN_PACKET_SIZE) {
    
    LoRaMessage incomingMessage; 

    // 2. LEER SOLO LO QUE SE RECIBIÓ (packetSize), no el sizeof(LoRaMessage).
    // Usaremos un buffer temporal o leeremos directamente la porción inicial del struct.
    // Dado que el struct es grande, leeremos directamente en el struct, 
    // pero solo hasta la longitud de 'packetSize'.
    int bytesRead = LoRa.readBytes((uint8_t*)&incomingMessage, packetSize);
    
    // 3. Verificar si leímos todos los bytes que llegaron.
    if (bytesRead == packetSize) {
      
      // 4. VERIFICACIÓN DE TAMAÑO DINÁMICO:
      // Ahora, validamos si el campo 'length' dentro del mensaje concuerda con el tamaño del paquete.
      // El tamaño esperado por los headers + payload es: 
      size_t expectedSize = MIN_PACKET_SIZE + incomingMessage.length;

      if (packetSize == expectedSize) {
          
        receivedPackages++;

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


        // 4. Imprimir el Checksum (sin verificación por ahora)

        Serial.print("4. Checksum (Recibido): 0x");

        Serial.println(incomingMessage.checksum, HEX);



        // 5. Imprimir el RSSI

        int rssi = LoRa.packetRssi();

        Serial.print("RSSI: ");

        Serial.println(rssi);



        Serial.println("-----------------------------");

        updateDisplayStatistics();
        return incomingMessage;
      
      } else {
          // El campo 'length' indica X, pero el paquete recibido era Y. Error de protocolo.
          erroredPackages++;
          Serial.print("Error de longitud en el protocolo! Paquete real: ");
          Serial.print(packetSize);
          Serial.print(", Esperado por Header: ");
          Serial.println(expectedSize);
      }

    } else {
        // Error de lectura (porción incompleta)
        erroredPackages++;
        Serial.println("Error: Lectura incompleta del buffer LoRa.");
    }
    
    // Si hubo un error, limpiar el buffer restante y devolver el error.
    while (LoRa.available()) {
        LoRa.read();
    }
    updateDisplayStatistics();
    return makePackage(messageType::INVALID, "error de protocolo");

  } else if (packetSize > 0) {
      // Paquete demasiado pequeño para siquiera contener los headers (corrupto)
      erroredPackages++;
      Serial.print("Paquete demasiado corto (");
      Serial.print(packetSize);
      Serial.print(" bytes). Mínimo: ");
      Serial.print(MIN_PACKET_SIZE);
      Serial.println(" bytes.");
      // Limpiar el buffer si el tamaño es incorrecto
      while (LoRa.available()) {
          LoRa.read();
      }
      updateDisplayStatistics();
      return makePackage(messageType::INVALID, "tamano insuficiente");
  }

  // Caso 3: No se recibió ningún paquete (packetSize == 0)
  return makePackage(messageType::INVALID, "ningun paquete recibido");
}


void sendPacket(LoRaMessage msg){
    // 1. Calcular el tamaño exacto del paquete.
    // No vamos a enviar el tamaño completo del struct (244B) ya que el mensaje puede que no contenga el tamaño completo del buffer y estariamos desperdiciando tiempo valioso de trasmision
    // En lugar de enviar paquetes estaticos de 244B enviaremos paquetes dinamicos para aprovechar mejor el tiempo de trasmision

    // Calcula el tamaño real de los datos a transmitir:
    // 1 (type) + 1 (length) + msg.length (datos reales) + 2 (checksum)

    size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
    
    size_t realPacketSize = headers + msg.length;

    Serial.print("Enviando paquete binario de ");
    Serial.print(realPacketSize);
    Serial.println(" bytes...");
    
    // --- Transmisión ---
    
    LoRa.idle(); // Pone la radio en modo inactivo (standby) antes de la TX.
    
    LoRa.beginPacket();
    
    LoRa.write((uint8_t*)&msg, realPacketSize);
    
    LoRa.endPacket(); // Cambiamos el chip a TX y enviamos el paquete.
    
    Serial.println("Respuesta enviada. Volviendo a RX.");
    sentPackcages++;
  
    // Volver al modo de recepción
    LoRa.receive();

    updateDisplayStatistics();
}

void updateDisplayStatistics(){
  // --- Actualizar Display ---

  display.clearDisplay();
  display.setCursor(0,0);
  display.print("Estadistica de paquetes:");
  display.setCursor(0,20);
  display.print("Enviados: ");
  display.print(sentPackcages);
  display.setCursor(0,30);
  display.print("Paquetes erroneos: ");
  display.print(erroredPackages);
  display.setCursor(0,40);
  display.print("Recibidos: ");
  display.print(receivedPackages);
  display.display();  
}


// --- La Interrupción (ISR) Notifica a la Tarea ---
void IRAM_ATTR onReceive(int packetSize) {
  // Las ISRs de FreeRTOS requieren una bandera para saber si una tarea de mayor 
  // prioridad debe ser despertada.
  BaseType_t xHigherPriorityTaskWoken = pdFALSE;

  // 1a. Notificar a la tarea principal (loop) de que hay un paquete.
  vTaskNotifyGiveFromISR(routerLoopTaskHandle, &xHigherPriorityTaskWoken);
  
  // 1b. Si se despertó una tarea de mayor prioridad, forzar un cambio de contexto.
  if (xHigherPriorityTaskWoken == pdTRUE) {
    portYIELD_FROM_ISR(); 
  }
}
