#include "Arduino.h"
#include "LoRaWan_APP.h"
#include <Wire.h>               
#include "HT_SSD1306Wire.h"
#include "images.h"
#include <vector>
#include <algorithm> // Necesario para std::sort

//----------------------------------LORA PARAMETERS--------------------------------
#define NUM_CHANELS 4

#define CHANEL_0 868100000
#define CHANEL_1 868300000
#define CHANEL_2 868500000
#define CHANEL_3 869525000

#define RF_FREQUENCY                                CHANEL_0 // Hz
#define TX_OUTPUT_POWER                             14        // dBm
#define LORA_BANDWIDTH                              0         // [0: 125 kHz]
#define LORA_SPREADING_FACTOR                       7         // [SF7]
#define LORA_CODINGRATE                             1         // [1: 4/5]
#define LORA_PREAMBLE_LENGTH                        8         
#define LORA_SYMBOL_TIMEOUT                         0         
#define LORA_FIX_LENGTH_PAYLOAD_ON                  false
#define LORA_IQ_INVERSION_ON                        false
#define RX_TIMEOUT_VALUE                            3000 // Aumentado a 3000 para dar margen      
#define MAX_PAYLOAD_SIZE                            240 



//----------------------------------ESTRUCTURAS---------------------------
#define SSID_LENGTH 13 

enum class messageType : uint8_t {
    BEACON_REQUEST = 0x00, BEACON_RESPONSE = 0x01,
    JOIN_REQUEST = 0x02, JOIN_ACCEPTED = 0x03, JOIN_DENIED = 0x04,
    NODE_BLOCKED = 0x05, NODE_LEAVING = 0x06, NODE_LEAVING_ACK = 0x07,
    DATA = 0x20, DATA_CONF = 0x21, DATA_CONF_ACK = 0x22, DATA_ACK = 0x23,
    INVALID = 0xFF 
};

typedef struct __attribute__((packed)) { size_t router; size_t id; } ControlData;
typedef struct __attribute__((packed)) {
  size_t router; 
  char SSID[SSID_LENGTH]; 
  int16_t rssi; // <--- NUEVO CAMPO (2 bytes), SOLO en la mota, ya que el router no sabe con que rssi escucha el beacon frame, se agrega al final para no ocasionar problemas.
  uint8_t channel; // <--- NUEVO CAMPO (4 bytes), SOLO en la mota, ya la mota no tiene porque fiarse del canal que dice el router por el que esta trasmitiendo, mejor comprobarlo.
} NetworkData;
typedef struct __attribute__((packed)) { size_t router; size_t id; size_t sendInterval; } ConfData;
typedef struct __attribute__((packed)) { 
  size_t router; size_t id; uint8_t humidity; uint8_t battery; float latitude; float longitude; 
} SensorsData;

typedef struct __attribute__((packed)) {
    messageType type; uint8_t length; uint16_t checksum;  
    union {
      uint8_t raw[MAX_PAYLOAD_SIZE]; NetworkData NetworkData; ControlData ControlData;
      ConfData ConfData; SensorsData SensorsData;
    } data;
} LoRaMessage;

//----------------------------------VARIABLES---------------------------

//ID'S
const size_t MY_NODE_ID = 50; 
size_t TARGET_ROUTER_ID = 0; 
char currentNetwork[SSID_LENGTH];
NetworkData selectedNW;

// Estadísticas
uint16_t receivedPackets = 0;
uint16_t sendedPackets = 0;
int16_t lastRssi = 0;
bool needDisplayUpdate = false; // BANDERA PARA PINTAR EN EL LOOP

//Sensores
uint8_t humidity = 75;
uint8_t battery = 90;
float latitude = 40.4167;
float longitude = -3.7037;

//----------------------------------Control pantalla ----------------------------------

// --- CONSTANTES DE TIEMPO ---
#define BUTTON_PIN 0            // Botón PRG en Heltec V3
#define DEBOUNCE_MS 50          // Filtro para rebotes
#define LONG_PRESS_MS 1000      // Tiempo para considerar pulsación larga (1s)

// --- ESTADOS DEL BOTÓN (Variable Global) ---
// Usamos un enum para que sea legible en cualquier parte del código
enum ButtonEvent {
  NO_PRESS,     // Nada ha pasado
  SHORT_PRESS,  // Pulsación corta detectada
  LONG_PRESS    // Pulsación larga detectada
};


// --- VARIABLES INTERNAS (No tocar desde fuera) [button press] ---
unsigned long pressStartTime = 0;
bool isPressing = false;
volatile ButtonEvent globalButtonState = NO_PRESS;


//OLED UI 
bool defaultMenu = 1; //Indica que vista del menu se tiene. 1 indica los datos visualizados por defecto 0 los demas... Todos no caben en 1 pantalla
unsigned long startScan = 0; // Indica el momento exacto en el que se empieza a escanear las redes lora


#define SCAN_TIME 20000 //Durante este tiempo (en ms) la mota estara mandando beacon_request a todos los routers que encuentre
unsigned long lastBeaconFrameSended = 0;
std::vector<NetworkData> foundNetworks;
int selectedNetworkIndex = 0; // Índice de la red que estamos "mirando" ahora mismo

// Lista de canales seguros (en Hz)
// Separación de 200kHz para evitar solapamiento de señal de 125kHz
const uint32_t channelList[] = {
    CHANEL_0, // Canal 0 (Estándar)
    CHANEL_1, // Canal 1 (Estándar)
    CHANEL_2, // Canal 2 (Estándar)
    CHANEL_3  // Canal 3 (Alta potencia / Reserva)
};

uint8_t scaningChanel = 0;

//---------------------------------------------------------------------------------------

//Maquina de estados
enum MotaState {
  STATE_INIT,
  STATE_START_SCAN, STATE_TX_SCAN, STATE_RX_SCAN,
  
  STATE_WAIT_USER_SELECTION,
  
  STATE_START_JOIN, STATE_TX_JOIN, STATE_RX_JOIN,
  STATE_START_DATA, STATE_TX_DATA, STATE_RX_DATA,
  STATE_SLEEP
};

MotaState currentState = STATE_INIT;
unsigned long stateStartTime = 0;
unsigned long lastSleepTime = 0; // Para el sleep no bloqueante

static SSD1306Wire display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED);
static RadioEvents_t RadioEvents;

void OnTxDone(void);
void OnTxTimeout(void);
void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr);

void VextON(void) { pinMode(Vext,OUTPUT); digitalWrite(Vext, LOW); }
void VextOFF(void) { pinMode(Vext,OUTPUT); digitalWrite(Vext, HIGH); }

//---------------------------------------------------------------------

void setup() {
  VextON(); 
  delay(100); 

  Serial.begin(115200);

  //Imprimimos el logo de inicio por serie
  Serial.println(SerialLogoFlora);
  Serial.println("Inciando Mota...");

  Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);
  
  initializeOled(); 
  initializeLora();

  pinMode(BUTTON_PIN, INPUT_PULLDOWN);

  currentState = STATE_START_SCAN;
  Serial.println("--- MOTA INICIADA ---");
}



// ---------------- LOOP PRINCIPAL ----------------
void loop() 
{
  //REVISION DE BANDERAS LORA
  Radio.IrqProcess();

  // 1. GESTION DE PANTALLA

  // Si estamos eligiendo red, la pantalla la controla el menú exclusivo
  if (currentState == STATE_WAIT_USER_SELECTION) {
      handleNetworkSelectionMenu();
  } 
  // Si estamos en cualquier otro estado, usamos la pantalla genérica
  else {
      updateOled(); 
  }

  //GESTION BOTON:
  checkButton();

  // 2. WATCHDOG DE SOFTWARE (SEGURIDAD)
  watchdogRX();

  // 3. MAQUINA DE ESTADOS
  switch (currentState) {
    
    // ================== SCAN ==================
    case STATE_START_SCAN:
      Serial.println("Comenzando a escanear redes...");
      startScan = millis();
      currentState = STATE_TX_SCAN;
      foundNetworks.clear();
      break;

    case STATE_TX_SCAN:
      // Esperando OnTxDone...
     
      if(millis() > lastBeaconFrameSended + random(1000,1500)){ //jitter de espera aleatoria para evitar colisiones [1000-1500] ms
        if(scaningChanel > NUM_CHANELS - 1) scaningChanel = 0;
        Serial.println("[APP] Enviando Beacon Request...");
        Radio.SetChannel(channelList[scaningChanel]);
        sendBeaconRequest();
        lastBeaconFrameSended = millis(); 
      }
      
      stateStartTime = millis();
      break;

    case STATE_RX_SCAN:
      // Esperando OnRxDone o Watchdog...
      break;


    case STATE_WAIT_USER_SELECTION:
      // Aquí no hacemos nada de radio. Solo esperamos al usuario.
      // La función handleNetworkSelectionMenu() se encarga de cambiar 
      // el estado a STATE_START_JOIN cuando el usuario elige.
      break;

    // ================== JOIN ==================
    case STATE_START_JOIN:
      Serial.println("[APP] Enviando Join Request...");
      sendJoinRequest();
      currentState = STATE_TX_JOIN;
      stateStartTime = millis();
      break;

    case STATE_TX_JOIN: break;
    case STATE_RX_JOIN: break;

    // ================== DATA ==================
    case STATE_START_DATA:
      Serial.println("[APP] Enviando Datos...");
      sendSensorData();
      currentState = STATE_TX_DATA;
      stateStartTime = millis();
      break;
        
    case STATE_TX_DATA: break;
    case STATE_RX_DATA: break;

    // ================== SLEEP (NO BLOQUEANTE) ==================
    case STATE_SLEEP:
        // Usamos millis en vez de delay
        if (millis() - lastSleepTime > 5000) { // 5 segundos de sleep
          Serial.println("Despertando...");
          currentState = STATE_START_DATA;
        }
        break;
  }
}

// ---------------- CALLBACKS  ----------------

void OnTxDone(void) {
  Serial.println("-> TX Done (IRQ)");
  sendedPackets++;
  needDisplayUpdate = true; // Avisamos al loop, NO pintamos aquí

  // Logica de cambio de estado
  if (currentState == STATE_TX_SCAN) {
    currentState = STATE_RX_SCAN;
    stateStartTime = millis(); // Reset para watchdog
    Radio.Rx(0);
  } 
  else if (currentState == STATE_TX_JOIN) {
    currentState = STATE_RX_JOIN;
    stateStartTime = millis();
    Radio.Rx(0);
  }
  else if (currentState == STATE_TX_DATA) {
    currentState = STATE_RX_DATA;
    stateStartTime = millis();
    Radio.Rx(0);
  }
}

void OnTxTimeout(void) {
  Serial.println("-> TX Timeout");
  currentState = STATE_START_SCAN; 
}

void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr) {
  Serial.printf("<- RX Done (%d bytes)\n", size);
  
  LoRaMessage incomingMsg;
  const size_t MIN_SIZE = sizeof(messageType) + sizeof(uint8_t) + sizeof(uint16_t);

  if (size < MIN_SIZE) return;
  memcpy(&incomingMsg, payload, min((size_t)size, (size_t)MIN_SIZE + MAX_PAYLOAD_SIZE));

  if (calculateChecksum(incomingMsg) != incomingMsg.checksum) {
      Serial.println("Checksum ERROR.");
      return;
  }

  receivedPackets++;
  lastRssi = rssi;
  needDisplayUpdate = true; // Avisamos al loop

  // MAQUINA DE ESTADOS
  switch(incomingMsg.type) {
      case messageType::BEACON_RESPONSE:
          // Si estamos en tiempo de escaneo, seguimos guardando redes
          if (currentState == STATE_RX_SCAN && millis() <= startScan + SCAN_TIME) {
            incomingMsg.data.NetworkData.channel = scaningChanel;
            saveNetwork(incomingMsg.data.NetworkData, rssi);
            scaningChanel++;
            currentState = STATE_TX_SCAN; 
          }
          // Si se acabó el tiempo...
          else if (currentState == STATE_RX_SCAN) {
             Serial.println("Fin del escaneo. Entrando en menú de selección...");
             
             if (foundNetworks.empty()) {
                Serial.println("No se encontraron redes. Reintentando...");
                currentState = STATE_START_SCAN;
             } else {
                selectedNetworkIndex = 0; // Resetear cursor
                currentState = STATE_WAIT_USER_SELECTION; // <--- Vamos al menú
             }
          }
          break;

      case messageType::JOIN_ACCEPTED:
          if (currentState == STATE_RX_JOIN) {
            Serial.println("Join aceptado -> DATA");
            currentState = STATE_START_DATA;
          }
          break;

      case messageType::DATA_ACK:
          if (currentState == STATE_RX_DATA) {
            Serial.println("ACK recibido -> SLEEP");
            lastSleepTime = millis(); // Marcamos hora de dormir
            currentState = STATE_SLEEP;
          }
          break;

      case messageType::JOIN_REQUEST:
          if (currentState == STATE_RX_DATA) {
            Serial.println("El router no ha procesado el paquete de datos anterior porque no estaba en la red, enviado solicitud de union...");
            lastSleepTime = millis(); // Marcamos hora de dormir
            currentState = STATE_START_JOIN;
          }
          break;
  }
}

//--------------- FUNCTIONS --------------------

void initializeOled(){
  display.init();
  display.setFont(ArialMT_Plain_10);
  display.clear();
  display.drawXbm(0,5,image_width,image_height,(const unsigned char *)image_bits);
  display.display();
  delay(2500);

  //Draw progress bar 
  for(int counter=0; counter<500; counter++){
    display.clear();
    display.setTextAlignment(TEXT_ALIGN_LEFT);
    display.drawString(0, 0, String("Initializing FLoRa Node..."));

    int progress = (counter / 5) % 100;
    // draw the progress bar
    display.drawProgressBar(0, 38, 120, 10, progress);
    counter++;

    // draw the percentage as String
    display.setTextAlignment(TEXT_ALIGN_CENTER);
    display.drawString(64, 25, String(progress) + "%");
    display.display();
    delay(20);
  }
  display.setTextAlignment(TEXT_ALIGN_LEFT);

}

void initializeLora(){
  RadioEvents.TxDone = OnTxDone;
  RadioEvents.TxTimeout = OnTxTimeout;
  RadioEvents.RxDone = OnRxDone;

  Radio.Init( &RadioEvents );
  Radio.SetChannel( RF_FREQUENCY );
  Radio.SetTxConfig( MODEM_LORA, TX_OUTPUT_POWER, 0, LORA_BANDWIDTH,
                                  LORA_SPREADING_FACTOR, LORA_CODINGRATE,
                                  LORA_PREAMBLE_LENGTH, LORA_FIX_LENGTH_PAYLOAD_ON,
                                  true, 0, 0, LORA_IQ_INVERSION_ON, 3000 );

  Radio.SetRxConfig( MODEM_LORA, LORA_BANDWIDTH, LORA_SPREADING_FACTOR,
                                  LORA_CODINGRATE, 0, LORA_PREAMBLE_LENGTH,
                                  LORA_SYMBOL_TIMEOUT, LORA_FIX_LENGTH_PAYLOAD_ON,
                                  0, true, 0, 0, LORA_IQ_INVERSION_ON, true );
}

uint16_t calculateChecksum(LoRaMessage msg) {
  const size_t buffSize = sizeof(msg.type) + sizeof(msg.length) + msg.length;
  uint8_t buff[buffSize];
  memcpy(&buff, &msg.type , sizeof(msg.type));
  memcpy(&buff[sizeof(msg.type)], &msg.length , sizeof(msg.length));
  memcpy(&buff[sizeof(msg.type) + sizeof(msg.length)], &msg.data, msg.length);

  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < sizeof(buff); i++) {
    crc ^= (uint16_t)buff[i] << 8;
    for (int j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
    }
  }
  return crc;
}

void sendMessage(LoRaMessage msg) {
  msg.checksum = calculateChecksum(msg);
  const size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
  const size_t realPacketSize = headers + msg.length;
  Radio.Send((uint8_t *)&msg, realPacketSize);
}

void sendBeaconRequest() {
  LoRaMessage msg;
  msg.type = messageType::BEACON_REQUEST; msg.length = 0; 
  sendMessage(msg);
}

void sendJoinRequest() {
  LoRaMessage msg;
  msg.type = messageType::JOIN_REQUEST;
  ControlData cdata; cdata.router = TARGET_ROUTER_ID; cdata.id = MY_NODE_ID;
  msg.data.ControlData = cdata; msg.length = sizeof(ControlData);
  sendMessage(msg);
}

void sendSensorData() {
  LoRaMessage msg;
  msg.type = messageType::DATA;
  SensorsData sdata; sdata.router = TARGET_ROUTER_ID; sdata.id = MY_NODE_ID;
  sdata.humidity = humidity; sdata.battery = battery; sdata.latitude = latitude; sdata.longitude = longitude;
  msg.data.SensorsData = sdata; msg.length = sizeof(SensorsData);
  sendMessage(msg);
}

void updateOled(){

  if(globalButtonState == SHORT_PRESS){
    defaultMenu = !defaultMenu;
    globalButtonState = NO_PRESS;
  }

  if(defaultMenu){

    if (needDisplayUpdate) {
      display.clear();
      display.drawString(10, 0, "=== FLoRa Node === 1/2");

      if(TARGET_ROUTER_ID != 0){
        display.drawString(0, 10, "Conected: " + String(currentNetwork));
        display.drawString(0, 20, "RSSI: " + String(lastRssi));
      }else{
        display.drawString(0, 10, "Not Conected");
      }
      
      display.drawString(0, 30, "ID: " + String(MY_NODE_ID) + " | R_ID: " + String(TARGET_ROUTER_ID) + " | [CH:" + String(selectedNW.channel) + "]");
      display.drawString(0, 40, "TX: " + String(sendedPackets) + " | RX: " + String(receivedPackets));
      
      
      
      // Mostrar estado actual para depurar
      String estadoStr = "";

      if(currentState == STATE_RX_JOIN) estadoStr = "Wait Join";
      else if(currentState == STATE_RX_DATA) estadoStr = "Wait ACK";
      else if(currentState == STATE_SLEEP) estadoStr = "Sleeping";
      else estadoStr = "Scaning...   [CH:" + String(scaningChanel) + "]"; //Fix scanning chanel
      display.drawString(0, 50, "State: " + estadoStr);

      display.display();
      needDisplayUpdate = false;
    }

  }else{

    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 2/2");
    display.drawString(0, 10, "Bat: " + String(battery) + "%");
    display.drawString(0, 20, "Hum: " + String(humidity) + "%");

    if(latitude != 0 && longitude != 0){
      display.drawString(0, 30, "GPS: OK");
      display.drawString(0, 40, "Lat: " + String(latitude , 6));
      display.drawString(0, 50, "Long: " + String(longitude , 6));
    }else{
      display.drawString(0, 30, "GPS: FAIL");
    }
    
    display.display();

  }
  
}

void watchdogRX(){
  // Si llevamos más de (RX_TIMEOUT + 1000ms) esperando, forzamos reinicio.
  if ((currentState == STATE_RX_SCAN || currentState == STATE_RX_JOIN || currentState == STATE_RX_DATA) 
    && (millis() - stateStartTime > (RX_TIMEOUT_VALUE + 1000))) {
    
    Serial.println("[WATCHDOG] Hardware RX colgado. Reiniciando...");
    Radio.Sleep();
    
    // Decisión de recuperación
    if(currentState == STATE_RX_DATA) currentState = STATE_START_DATA;
    else currentState = STATE_TX_SCAN; scaningChanel++;
  }
}

void checkButton() {
  // Leemos el botón (recordamos que LOW es pulsado en Heltec V3)
  bool currentState = (digitalRead(BUTTON_PIN) == LOW);

  // 1. FLANCO DE BAJADA (Detectar inicio de pulsación)
  if (currentState && !isPressing) {
    isPressing = true;
    pressStartTime = millis();
  }

  // 2. FLANCO DE SUBIDA (Detectar que se ha soltado)
  if (!currentState && isPressing) {
    isPressing = false;
    
    // Calculamos cuánto duró la pulsación
    unsigned long duration = millis() - pressStartTime;

    // 3. CLASIFICACIÓN DEL EVENTO
    if (duration < DEBOUNCE_MS) {
      // Fue ruido, no hacemos nada
      globalButtonState = NO_PRESS; 
    } 
    else if (duration < LONG_PRESS_MS) {
      // Fue una pulsación válida y rápida
      globalButtonState = SHORT_PRESS;
    } 
    else {
      // Fue una pulsación larga
      globalButtonState = LONG_PRESS;
    }
  }
}

// Función de comparación para el ordenamiento (Mayor RSSI primero)
bool compareRSSI(const NetworkData &a, const NetworkData &b) {
  return a.rssi > b.rssi; // Eje: -50 > -90 (Verdadero, -50 va antes)
}

void saveNetwork(NetworkData newNet, int16_t currentRssi) {
  
  // 1. Asignamos el RSSI que acabamos de medir
  newNet.rssi = currentRssi;

  bool found = false;

  // 2. Buscamos si ya existe
  for (int i = 0; i < foundNetworks.size(); i++) {
    if (foundNetworks[i].router == newNet.router) {
      // YA EXISTE: Actualizamos su RSSI con el valor más reciente
      foundNetworks[i].rssi = currentRssi;
      found = true;
      break; // Dejamos de buscar
    }
  }
  
  // 3. Si NO existe, la añadimos
  if (!found) {
    foundNetworks.push_back(newNet);
    Serial.printf("Nueva red: %s (RSSI: %d) [CANAL: %d] \n", newNet.SSID, newNet.rssi, scaningChanel);
  }

  // 4. ORDENAR LA LISTA (La magia de C++)
  // Esto reordena el vector para que los RSSI más altos (mejores) queden en la posición [0]
  std::sort(foundNetworks.begin(), foundNetworks.end(), compareRSSI);
}

void handleNetworkSelectionMenu() {
  display.clear();
  display.setTextAlignment(TEXT_ALIGN_LEFT);
  display.drawString(0, 0, "== SELECT NETWORK ==");

  // Si no hay redes (por seguridad)
  if (foundNetworks.empty()) {
     display.drawString(0, 20, "There are no networks :(");
     display.display();
     delay(2000);
     currentState = STATE_START_SCAN;
     return;
  }

  // --- LÓGICA DE BOTONES ---
  
  // 1. Pulsación CORTA -> Siguiente red (Scroll circular)
  if (globalButtonState == SHORT_PRESS) {
      selectedNetworkIndex++;
      if (selectedNetworkIndex >= foundNetworks.size()) {
          selectedNetworkIndex = 0; // Volver al principio
      }
      globalButtonState = NO_PRESS; // Consumir evento
  }

  // 2. Pulsación LARGA -> Seleccionar y Conectar
  if (globalButtonState == LONG_PRESS) {
      // Guardar selección
      selectedNW = foundNetworks[selectedNetworkIndex];
      TARGET_ROUTER_ID = selectedNW.router;
      memcpy(currentNetwork, selectedNW.SSID, SSID_LENGTH);
      Radio.SetChannel(channelList[selectedNW.channel]); //Seteamos la radio a ese canal

      // Feedback visual
      display.clear();
      display.drawString(35, 25, "[Connecting]");
      display.display();
      delay(2000);
      
      globalButtonState = NO_PRESS; // Consumir evento
      currentState = STATE_START_JOIN; // <--- INICIAR PROCESO DE UNION
      return;
  }


  // --- DIBUJADO DE LA LISTA (CON SCROLL) ---
  
  // Calculamos qué parte de la lista mostrar (Ventana de 4 elementos)
  const int ITEMS_PER_PAGE = 4;
  int startList = 0;
  
  // Si el seleccionado está más allá de la página 1, movemos el inicio
  if (selectedNetworkIndex >= ITEMS_PER_PAGE) {
      startList = selectedNetworkIndex - (ITEMS_PER_PAGE - 1);
  }

  for (int i = 0; i < ITEMS_PER_PAGE; i++) {
      int currentIndex = startList + i;
      
      // Si nos salimos de la lista total, paramos
      if (currentIndex >= foundNetworks.size()) break;

      int yPos = 15 + (i * 12);
      
      // Construimos el texto: "Finca_A (-80)"
      String linea = String(foundNetworks[currentIndex].SSID);
      linea += " (" + String(foundNetworks[currentIndex].rssi) + ")";
      linea += " [CH:" + String(foundNetworks[currentIndex].channel) + "]";

      // Si es el seleccionado, lo pintamos INVERTIDO (Fondo blanco, texto negro)
      if (currentIndex == selectedNetworkIndex) {
          // Dibujar caja blanca de fondo
          display.setColor(WHITE);
          display.fillRect(0, yPos, 128, 12);
          // Dibujar texto en negro
          display.setColor(BLACK);
          display.drawString(1, yPos, linea); // +1px margen
          // Volver a color normal para el resto
          display.setColor(WHITE);
      } else {
          // Normal
          display.drawString(1, yPos, linea);
      }
  }

  display.display();
}
