#include "Arduino.h"
#include "LoRaWan_APP.h"
#include <Wire.h>
#include "HT_SSD1306Wire.h"
#include "images.h"
#include <vector>
#include <algorithm>  // Necesario para std::sort


//----------------------------------LORA PARAMETERS--------------------------------
#define NUM_CHANELS 4

#define CHANEL_0 868100000
#define CHANEL_1 868300000
#define CHANEL_2 868500000
#define CHANEL_3 869525000

#define TX_OUTPUT_POWER 14       // dBm
#define LORA_BANDWIDTH 0         // [0: 125 kHz]
#define LORA_SPREADING_FACTOR 7  // [SF7]
#define LORA_CODINGRATE 1        // [1: 4/5]
#define LORA_PREAMBLE_LENGTH 8
#define LORA_SYMBOL_TIMEOUT 0
#define LORA_FIX_LENGTH_PAYLOAD_ON false
#define LORA_IQ_INVERSION_ON false
#define RX_TIMEOUT_VALUE 3000  // Aumentado a 3000 para dar margen
#define MAX_PAYLOAD_SIZE 240

#define RSSI_THRESHOLD -80  // RSSI maximo para trasmitir, un valor mayor se considera que el canal esta ocupado o hay demasiado ruido ambiente


//----------------------------------ESTRUCTURAS---------------------------
#define SSID_LENGTH 8 + 1  // +1 para el terminador nulo

enum class messageType : uint8_t {

  // --- Solicitud y Descubrimiento ---
  BEACON_REQUEST = 0x00,  // La mota envia este mensaje para descubir nuevos routers a los que conectarse.

  BEACON_RESPONSE = 0x01,  // El router responde a un BEACON_REQUEST con un un BEACON_RESPONSE dando informacion de la red que gestiona.

  JOIN_REQUEST = 0x02,  // Solicitud de union a la red.

  JOIN_ACCEPTED = 0x03,  // Respuesta del coordinador que acepta la solicitud.

  JOIN_DENIED = 0x04,  // Respuesta del coordinador que deniega la solicitud de unión.

  NODE_BLOCKED = 0x05,  // Mensaje del coordinador para informar a un nodo que está bloqueado.

  NODE_LEAVING = 0x06,  // Mensaje de un nodo que desea salir de la red de forma controlada.

  NODE_LEAVING_ACK = 0x07,  //Mensaje para informar al nodo de que ha sido eliminado de la red.

  // ---  Mensajes de Datos ---
  DATA = 0x20,  // Paquete que contiene la carga útil de datos, entre ellos se encuentra la huedad, bateria y localizacion.

  DATA_CONF = 0x21,  //Paquete que contiene datos de configuracion para la mota, confirma que ha recibido sus datos en el paquete anterior (piggibacking),
  //se aprovecha para confirmar y enviar nueva configuracion. Si no hubiera configuracion nueva se confirman los datos recibidos en el paquete anterior con DATA_ACK.
  //Solo se envia la configuracion cuando la mota se despierta y envia datos, en otro momento esta dormida.

  DATA_CONF_ACK = 0x22,  //Paquete que confirma que la mota ha recibido la configuracion enviada anteriormente en un paquete tipo DATA_CONF.

  DATA_ACK = 0x23,  // Acknowledge (Confirmación) de recepción de DATA.

  INVALID = 0xFF  // Default o desconocido

};

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene los ID del router y mota que se estan comunicando, estos campos se usan para evitar que otras motas/router procesen un paquete que no van para ellos.

  size_t router;  //Router al que va destinado el paquete, siempre > 0

  size_t id;  // ID desde el que proviene el paquete, siempre > 0

} ControlData;

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene el ID del router que manda el beacon frame, asi como el SSID de la red

  size_t router;  //Router que gestiona la red anunciada

  char SSID[SSID_LENGTH];  //Nombre descriptivo de la red anunciada, se muestra en la pantalla oled de las motas en el proceso de vinculacion.

  bool isPublic;  //Indica si el router es publico o privado


} NetworkData;
// Wrapper de NetworkData, añade informacion que captura la mota al recibir el beacon frame (o probe response) del router
struct ScannedNetwork {
  NetworkData info;
  int16_t rssi;
  uint8_t channel;
};

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene los ID del router y mota que se estan comunicando, estos campos se usan para evitar que otras motas/router procesen un paquete que no van para ellos.

  size_t router;  //ID Router que manda el paquete, siempre > 0

  size_t id;  // ID mota a la que va destinada la configuracion, siempre > 0

  size_t sendInterval;  // Periodo en segundos que la mota tarda en enviar informacion

  int8_t allowPublicConn;  // Variable que le permite a la mota conectarse a routers publicos si el propio falla
                           //Deberia ser bool, pero como el sistema de actualizaccion de configuraciones es de tipo delta
                           //hay parametros del backend que no vienen, pero en LoRa tenemos que incluirlo (sino el struct se llena con la basura de la RAM)
                           //Necesitamos 3 estados:
                           // 1: allowPublicConn = -1 <-- No se aplica, la mota mantiene su valor
                           // 2: allowPublicConn = 0 <-- Se aplica, no se permiten conexiones publicas
                           // 3: allowPublicConn = 1 <-- Se aplica, se permiten conexiones publicas

  uint16_t version;  // Version de la configuracion de la mota a aplicar

} ConfData;

typedef struct __attribute__((packed)) {

  //Paquete de carga util que contiene los ID del router y mota que se estan comunicando, estos campos se usan para evitar que otras motas/router procesen un paquete que no van para ellos.
  //Ademas de los ID contiene los datos que recopila la mota.

  size_t router;  //Router al que va destinado el paquete, siempre > 0

  size_t id;  // ID desde el que proviene el paquete, siempre > 0

  uint8_t humidity;

  uint8_t battery;

  float latitude;  // Mejor mandar las coordenadas como 2 float (4B cada uno) que como un array de caracteres (Ahorramos espacio).

  float longitude;

  uint16_t version;  // Version de la configuracion de la mota

} SensorsData;

typedef struct __attribute__((packed)) {

  messageType type;

  uint8_t length;

  uint16_t checksum;

  union {
    uint8_t raw[MAX_PAYLOAD_SIZE];
    NetworkData NetworkData;
    ControlData ControlData;
    ConfData ConfData;
    SensorsData SensorsData;
  } data;

} LoRaMessage;

//----------------------------------VARIABLES---------------------------

//ID'S
const size_t MY_NODE_ID = 50;
size_t TARGET_ROUTER_ID = 0;  //--> PERSIISTIR ENTRE REINICIOS
char currentNetwork[SSID_LENGTH];
ScannedNetwork selectedNW = { 0 };  //--> PERSIISTIR ENTRE REINICIOS

// Estadísticas/Telemetria --> PERSIISTIR ENTRE REINICIOS
uint16_t receivedPackets = 0;
uint16_t sendedPackets = 0;
int16_t lastRssi = 0;
uint16_t rx_err = 0;
uint16_t tx_err = 0;
uint16_t channelBusyErrors = 0;
uint16_t missingAckErrors = 0;
//--
bool needDisplayUpdate = false;  // BANDERA PARA PINTAR EN EL LOOP

//Configuracion --> PERSISITIR ENTRE REINICIOS
uint16_t version = 0;         // Version de la configuracion de la mota
size_t sendInterval = 30000;  // Frecuencia con la que la mota envia datos en milisegundos (30s por defecto, pruebas iniciales)
int8_t allowPublicConn = 1;   //Se permiten conexiones publicas por defecto

//Con signo por si se pasa de 0 no vuelva a 255
int8_t TXattempts = 3;  // (TX TIMEOUT) Durante el encendido de la mota reducimos hasta llegar a 0, cuando lo haga se pone a dormir, cuando despierte la variable estara en 3 otra vez (no persiste el valor)
int8_t RXattempts = 3;  // (RX TIMEOUT) igual que TXattempts

int8_t changeRouterAttempts = 7; //Veces seguidas en las que se produce RXTimeOUT con el mismo router, cuando llega a 0, se cambia a un router publico si allowPublicConn es true
                                 // --> PERSISITIR ENTRE REINICIOS


//Sensores
uint8_t humidity = 75;
uint8_t battery = 90;
float latitude = 40.4167;
float longitude = -3.7037;

//----------------------------------Control pantalla ----------------------------------

// --- CONSTANTES DE TIEMPO ---
#define BUTTON_PIN 0        // Botón PRG en Heltec V3
#define DEBOUNCE_MS 50      // Filtro para rebotes
#define LONG_PRESS_MS 1000  // Tiempo para considerar pulsación larga (1s)

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
uint8_t defaultMenu = 0;  //Indica que vista del menu se tiene. Todos los datos no caben en 1 pantalla


#define SCAN_TIME 30000  //Durante este tiempo (en ms) la mota estara mandando beacon_request a todos los routers que encuentre
unsigned long startScan = 0;  // Indica el momento exacto en el que se empieza a escanear las redes lora
unsigned long lastBeaconFrameSended = 0;
uint8_t scaningChanel = 0;
std::vector<ScannedNetwork> foundNetworks;
int selectedNetworkIndex = 0;  // Índice de la red que estamos "mirando" ahora mismo


// Lista de canales seguros (en Hz)
// Separación de 200kHz para evitar solapamiento de señal de 125kHz
const uint32_t channelList[] = {
  CHANEL_0,  // Canal 0 (Estándar)
  CHANEL_1,  // Canal 1 (Estándar)
  CHANEL_2,  // Canal 2 (Estándar)
  CHANEL_3   // Canal 3 (Alta potencia / Reserva)
};



//---------------------------------------------------------------------------------------

//Maquina de estados
enum MotaState {
  STATE_INIT,
  STATE_START_SCAN,
  STATE_TX_SCAN,
  STATE_RX_SCAN,

  STATE_WAIT_USER_SELECTION,

  STATE_START_JOIN,
  STATE_TX_JOIN,
  STATE_RX_JOIN,
  STATE_START_DATA,
  STATE_TX_DATA,
  STATE_RX_DATA,
  STATE_SLEEP
};

MotaState currentState = STATE_INIT;
unsigned long stateStartTime = 0;
unsigned long lastSleepTime = 0;  // Para el sleep no bloqueante

static SSD1306Wire display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED);
static RadioEvents_t RadioEvents;

void OnTxDone(void);
void OnTxTimeout(void);
void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr);

void VextON(void) {
  pinMode(Vext, OUTPUT);
  digitalWrite(Vext, LOW);
}
void VextOFF(void) {
  pinMode(Vext, OUTPUT);
  digitalWrite(Vext, HIGH);
}

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
void loop() {
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

      if (millis() > lastBeaconFrameSended + random(1000, 1500)) {  //jitter de espera aleatoria para evitar colisiones [1000-1500] ms
        if (scaningChanel > NUM_CHANELS - 1) scaningChanel = 0;
        Serial.println("[APP] Enviando Beacon Request...");
        Radio.SetChannel(channelList[scaningChanel]);
        sendBeaconRequest();
        lastBeaconFrameSended = millis();
      }

      stateStartTime = millis();
      break;

    case STATE_RX_SCAN:
      // Esperando OnRxDone o Watchdog...
      //Comprobacion de fin de escaneo:
      if (millis() > startScan + SCAN_TIME) {

        Serial.println("Fin del escaneo.");
        
       //Decidimos si la seleccion de red debe ser automatica o manual
       if(selectedNW.info.router == 0){ //Es la primera vez que se escanea una red o el usuario limpio la red seleccionada --> activar menu oled para seleccion manual
          selectedNetworkIndex = 0;                  // Resetear cursor
          currentState = STATE_WAIT_USER_SELECTION;  // <--- Vamos al menú

        }else if(selectedNW.info.router != 0 && allowPublicConn == 1){ //Teniamos una red guardada y podemos conectarnos a un router publico, si hemos llegado aqui es porque el router actual 
        //no contesta en multiples ocasiones, se conecta automaticamente al router publico con mayor señal.

          if (foundNetworks.empty()) {
            Serial.println("No se encontraron redes. (auto)");
            lastSleepTime = millis();    // Marcamos hora de dormir
            currentState = STATE_SLEEP;  //Nos ponemos a dormir, se intentara otra vez si el router falla de nuevo (watchdogRX)
            return; //Salimos sin ejecutar las intrsucciones restantes
          }

          //Filtramos por router publicos:
          //Escojemos el de mayor señal (estan ordenados de mayor a peor)
          for(ScannedNetwork sc:foundNetworks){

            if(sc.info.isPublic){
              selectedNW = sc;
              TARGET_ROUTER_ID = selectedNW.info.router;
              memcpy(currentNetwork, selectedNW.info.SSID, SSID_LENGTH);
              Radio.SetChannel(channelList[selectedNW.channel]);  //Seteamos la radio a ese canal
              Serial.printf("Intentando la conexion con un router publico (R_ID: %d) (auto)\n",sc.info.router);
              currentState = STATE_START_JOIN;  // <--- INICIAR PROCESO DE UNION
              return; //Salimos sin ejecutar las intrsucciones restantes
            }
          }
          
          Serial.println("Se encontro al menos una red pero ninguna era publica.");
          
        }
        
      }
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
      if (millis() - lastSleepTime > sendInterval) {
        Serial.println("Despertando...");

        // --- RECARGAMOS LOS INTENTOS AL EMPEZAR UN NUEVO CICLO ---
        TXattempts = 3;
        RXattempts = 3;
        // ---------------------------------------------------------

        if(selectedNW.info.router == 0){  // No tiene red, ya que el id del router no puede ser 0
          currentState = STATE_START_SCAN; //Empieza un nuevo scaneo
        }else{ //Tiene red, enviar datos...
          currentState = STATE_START_DATA;
        }
        
      }
      break;
  }
}

// ---------------- CALLBACKS  ----------------

void OnTxDone(void) {
  Serial.println("-> TX Done (IRQ)");
  sendedPackets++;
  needDisplayUpdate = true;  // Avisamos al loop, NO pintamos aquí

  // Logica de cambio de estado
  if (currentState == STATE_TX_SCAN) {
    currentState = STATE_RX_SCAN;
    stateStartTime = millis();  // Reset para watchdog
    Radio.Rx(0);
  } else if (currentState == STATE_TX_JOIN) {
    currentState = STATE_RX_JOIN;
    stateStartTime = millis();
    Radio.Rx(0);
  } else if (currentState == STATE_TX_DATA) {
    currentState = STATE_RX_DATA;
    stateStartTime = millis();
    Radio.Rx(0);
  }
}

void OnTxTimeout(void) {  //Falla al trasmitir por LoRA
  Serial.println("-> TX Timeout");
  tx_err++;
  TXattempts--;

  if (TXattempts <= 0) {
    lastSleepTime = millis();    // Marcamos hora de dormir
    currentState = STATE_SLEEP;  //Nos ponemos a dormir
  }
}

void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr) {
  Serial.printf("<- RX Done (%d bytes)\n", size);

  LoRaMessage incomingMsg = {};
  const size_t MIN_SIZE = sizeof(messageType) + sizeof(uint8_t) + sizeof(uint16_t);

  if (size < MIN_SIZE) {
    rx_err++;
    return;
  }

  memcpy(&incomingMsg, payload, min((size_t)size, (size_t)MIN_SIZE + MAX_PAYLOAD_SIZE));

  if (calculateChecksum(incomingMsg) != incomingMsg.checksum) {
    Serial.println("Checksum ERROR.");
    rx_err++;
    TXattempts = 3; // <--- EXITO: Recargamos intentos
    RXattempts = 3; // <--- EXITO: Recargamos intentos
    changeRouterAttempts = 7; //Restablecemos la variable, hemos restablecido la comunicacion con el router.
    return;
  }

  receivedPackets++;
  lastRssi = rssi;
  needDisplayUpdate = true;  // Avisamos al loop

  switch (incomingMsg.type) {
    case messageType::BEACON_RESPONSE:
      // Si estamos en tiempo de escaneo, seguimos guardando redes
      if (currentState == STATE_RX_SCAN && millis() <= startScan + SCAN_TIME) {
        saveNetwork(incomingMsg.data.NetworkData, rssi, scaningChanel);
        scaningChanel++;
        currentState = STATE_TX_SCAN;
      }
      break;

    case messageType::JOIN_ACCEPTED:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;

      if (currentState == STATE_RX_JOIN) {
        Serial.println("Join aceptado -> DATA");
        currentState = STATE_START_DATA;
      }
      break;

    case messageType::DATA_ACK:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;
      if (currentState == STATE_RX_DATA) {
        Serial.println("ACK recibido -> SLEEP");
        lastSleepTime = millis();  // Marcamos hora de dormir
        currentState = STATE_SLEEP;
      }
      break;

    case messageType::DATA_CONF:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;
      if (currentState == STATE_RX_DATA) {
        Serial.println("Se ha recibido un paquete de configuracion. Aplicando...");
        //Llmamos a la funcion para aplicar los cambios en la mota:
        ConfData config = incomingMsg.data.ConfData;
        applyConfig(config);
        //Enviamos DATA_CONF_ACK al router para que elimine la configuracion pendiente
        sendDataConfACK();
        lastSleepTime = millis();    // Marcamos hora de dormir
        currentState = STATE_SLEEP;  //Nos ponemos a dormir
      }
      break;

    case messageType::JOIN_REQUEST:
      if (!isForMe(incomingMsg.data.ControlData.id)) return;
      if (currentState == STATE_RX_DATA) {
        Serial.println("El router no ha procesado el paquete de datos anterior porque no estaba en la red, enviado solicitud de union...");
        lastSleepTime = millis();  // Marcamos hora de dormir
        currentState = STATE_START_JOIN;
      }
      break;
  }
}

//--------------- FUNCTIONS --------------------

void initializeOled() {
  display.init();
  display.setFont(ArialMT_Plain_10);
  display.clear();
  display.drawXbm(0, 5, image_width, image_height, (const unsigned char *)image_bits);
  display.display();
  delay(2500);

  //Draw progress bar
  for (int counter = 0; counter < 500; counter++) {
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

void initializeLora() {
  RadioEvents.TxDone = OnTxDone;
  RadioEvents.TxTimeout = OnTxTimeout;
  RadioEvents.RxDone = OnRxDone;

  Radio.Init(&RadioEvents);
  Radio.SetChannel(channelList[selectedNW.channel]);  //Si todavia no se eligio la red entonces todo en el struct es 0 por tanto, el canal tambien
  Radio.SetTxConfig(MODEM_LORA, TX_OUTPUT_POWER, 0, LORA_BANDWIDTH,
                    LORA_SPREADING_FACTOR, LORA_CODINGRATE,
                    LORA_PREAMBLE_LENGTH, LORA_FIX_LENGTH_PAYLOAD_ON,
                    true, 0, 0, LORA_IQ_INVERSION_ON, 3000);

  Radio.SetRxConfig(MODEM_LORA, LORA_BANDWIDTH, LORA_SPREADING_FACTOR,
                    LORA_CODINGRATE, 0, LORA_PREAMBLE_LENGTH,
                    LORA_SYMBOL_TIMEOUT, LORA_FIX_LENGTH_PAYLOAD_ON,
                    0, true, 0, 0, LORA_IQ_INVERSION_ON, true);
}

uint16_t calculateChecksum(LoRaMessage msg) {
  const size_t buffSize = sizeof(msg.type) + sizeof(msg.length) + msg.length;
  uint8_t buff[buffSize];
  memcpy(&buff, &msg.type, sizeof(msg.type));
  memcpy(&buff[sizeof(msg.type)], &msg.length, sizeof(msg.length));
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

bool sendMessage(LoRaMessage msg) {
  msg.checksum = calculateChecksum(msg);
  const size_t headers = sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.checksum);
  const size_t realPacketSize = headers + msg.length;

  int8_t attempts = 3;  //Intentos para trasmitir, si en los 3 (con esperas aleatorias) falla, cancelamos y devolvemos false
  delay(50);            //jitter de espera  antes de enviar, por si acabamos de recibir un mensaje, esperamos a que el ruido se vaya.
  while (attempts > 0) {

    if (IsChannelFree()) {
      Radio.Send((uint8_t *)&msg, realPacketSize);
      return true;
    } else {
      int16_t currentRssi = Radio.Rssi(MODEM_LORA);
      Serial.printf("DEBUG -> Intento %d: Canal ocupado. RSSI actual: %d dBm (Límite: %d)\n", 4 - attempts, currentRssi, RSSI_THRESHOLD);
      delay(random(50, 200));  //jitter de espera aleatoria para iniciar un nuevo intent
      channelBusyErrors++;
    }
    attempts--;
  }

  Serial.printf("No se ha podido enviar el mensaje. Causa: Canal ocupado.\n");
  return false;
}

void sendBeaconRequest() {
  LoRaMessage msg;
  msg.type = messageType::BEACON_REQUEST;
  msg.length = 0;
  if (!sendMessage(msg)) {         //Si falla el envio
    currentState = STATE_TX_SCAN;  //Seguimos intentando escanear redes
  }
}

void sendJoinRequest() {
  LoRaMessage msg;
  msg.type = messageType::JOIN_REQUEST;
  ControlData cdata;
  cdata.router = TARGET_ROUTER_ID;
  cdata.id = MY_NODE_ID;
  msg.data.ControlData = cdata;
  msg.length = sizeof(ControlData);
  if (!sendMessage(msg)) {            //Si falla el envio
    currentState = STATE_START_JOIN;  //Seguimos intentando unirnos a la red, no podemos irnos a dormir sin red
  }
}

void sendSensorData() {
  LoRaMessage msg;
  msg.type = messageType::DATA;
  SensorsData sdata;
  sdata.router = TARGET_ROUTER_ID;
  sdata.id = MY_NODE_ID;
  sdata.humidity = humidity;
  sdata.battery = battery;
  sdata.latitude = latitude;
  sdata.longitude = longitude;
  msg.data.SensorsData = sdata;
  msg.length = sizeof(SensorsData);
  if (!sendMessage(msg)) {       //Si falla el envio
    lastSleepTime = millis();    // Marcamos hora de dormir
    currentState = STATE_SLEEP;  //Nos ponemos a dormir
  }
}

void sendDataConfACK() {
  LoRaMessage msg;
  msg.type = messageType::DATA_CONF_ACK;
  ControlData cdata;
  cdata.router = TARGET_ROUTER_ID;
  cdata.id = MY_NODE_ID;
  msg.data.ControlData = cdata;
  msg.length = sizeof(ControlData);
  sendMessage(msg);  //Nos vamos a dormir falle o no
}


void updateOled() {

  if (globalButtonState == SHORT_PRESS) {
    defaultMenu++;
    needDisplayUpdate = true;  //La primera vez se tiene que dibujar la pantalla, luego actualizar manualmente cuando sea necesario.
    if (defaultMenu > 3) defaultMenu = 0;
    globalButtonState = NO_PRESS;
  }

  if (defaultMenu == 0 && needDisplayUpdate) {

    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 1/4");

    if (TARGET_ROUTER_ID != 0) {
      display.drawString(0, 10, "Conected: " + String(currentNetwork));
      display.drawString(0, 20, "RSSI: " + String(lastRssi));
    } else {
      display.drawString(0, 10, "Not Conected");
    }

    display.drawString(0, 30, "ID: " + String(MY_NODE_ID) + " | R_ID: " + String(TARGET_ROUTER_ID) + " | [CH:" + String(selectedNW.channel) + "]");
    display.drawString(0, 40, "TX: " + String(sendedPackets) + " | RX: " + String(receivedPackets));



    // Mostrar estado actual para depurar
    String estadoStr = "";

    if (currentState == STATE_RX_JOIN) estadoStr = "Wait Join";
    else if (currentState == STATE_RX_DATA) estadoStr = "Wait ACK";
    else if (currentState == STATE_SLEEP) estadoStr = "Sleeping";
    else estadoStr = "Scaning...   [CH:" + String(scaningChanel) + "]";  //Fix scanning chanel
    display.drawString(0, 50, "State: " + estadoStr);

    display.display();

    needDisplayUpdate = false;

  } else if (defaultMenu == 1 && needDisplayUpdate) {

    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 2/4");
    display.drawString(0, 10, "Rx_err: " + String(rx_err));
    display.drawString(0, 20, "Tx_err: " + String(tx_err));
    display.drawString(0, 30, "ChannelBusyErrors: " + String(channelBusyErrors));
    display.drawString(0, 40, "MissingAckErrors: " + String(missingAckErrors));

    display.display();
    needDisplayUpdate = false;


  } else if (defaultMenu == 2 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 3/4");
    display.drawString(0, 10, "SendInterval: " + String(((float)sendInterval / 1000) / 60) + " min");
    display.drawString(0, 20, "AllowPublicConn: " + String(allowPublicConn == 0 ? "False" : "True"));
    display.drawString(0, 30, "Config Version: " + String(version) + ".0");

    display.display();
    needDisplayUpdate = false;

  } else if (defaultMenu == 3 && needDisplayUpdate) {
    display.clear();
    display.drawString(10, 0, "=== FLoRa Node === 4/4");
    display.drawString(0, 10, "Bat: " + String(battery) + "%");
    display.drawString(0, 20, "Hum: " + String(humidity) + "%");

    if (latitude != 0 && longitude != 0) {
      display.drawString(0, 30, "GPS: OK");
      display.drawString(0, 40, "Lat: " + String(latitude, 6));
      display.drawString(0, 50, "Long: " + String(longitude, 6));
    } else {
      display.drawString(0, 30, "GPS: FAIL");
    }

    display.display();
    needDisplayUpdate = false;
  }
}

void watchdogRX() {
  // Si llevamos más de RX_TIMEOUT_VALUE esperando, forzamos reinicio.
  if ((currentState == STATE_RX_SCAN || currentState == STATE_RX_JOIN || currentState == STATE_RX_DATA)
      && (millis() - stateStartTime > RX_TIMEOUT_VALUE)) {

    Serial.println("[WATCHDOG] Hardware RX colgado. Reiniciando...");
    Radio.Sleep();

    // Decisión de recuperación
    if (currentState == STATE_RX_DATA) {  //Estamos esperando la confirmacion del router

      currentState = STATE_START_DATA;
      RXattempts--;
      changeRouterAttempts--;
      
      if (RXattempts < 0) RXattempts = 0;
      if (changeRouterAttempts < 0) changeRouterAttempts = 0;
      
      missingAckErrors++;

      if(changeRouterAttempts <= 0 && allowPublicConn == 1){ //Intentamos buscar una red publica y nos conectamos si es posible.
        currentState = STATE_START_SCAN; //Empezamos el scaneo, cuando este acaba, decidimos como seleccionamos la red, si manual (menu en oled) o automatica (red publica con mejor calidad de señal)
                                         //Si no encuentra ninguna red publica (proxmimo estado --> sleep), seguira con la que tenia guardada, intentando en cada despertar contactar con el 1 vez (watchdogRX), si no lo consigue entrara aqui otra vez (changeRouterAttempts <= 0)
                                         //comenzando de nuevo el ciclo, hasta que o se consiga conectar a un router publico (actualizacion de router_id) o recupere la conexion con el que tenia (changeRouterAttempts = 7).
                                         
                                         //Se intentara conectar al router antiguo porque cuando sale del deep sleep en funcion de si tiene o no una red guardada (id router != 0) comienza el scaneo o intenta
                                         // mandar los datos a su router por defecto (se supone que lo tiene guardado desde el primer arranque, cuando se selecciono la red en la oled).
                                         
                                         //Solo cuando se decide hacer un scaneo manual en el primer arranque o cuando el usuario lo elija en la interfaz oled (en este caso se pone id router = 0 para activar la seleccion de red manual)
      }else if (RXattempts <= 0) {

        lastSleepTime = millis();    // Marcamos hora de dormir
        currentState = STATE_SLEEP;  //Nos ponemos a dormir
      }
      //Serial.println("C.E: "+ String(currentState)+ "/ RXa: " + String(RXattempts));
    } else {  //Estamos escaneando redes
      currentState = STATE_TX_SCAN;
      scaningChanel++;
    }
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
    } else if (duration < LONG_PRESS_MS) {
      // Fue una pulsación válida y rápida
      globalButtonState = SHORT_PRESS;
      needDisplayUpdate = true;  //Necesitaremos actualizar la pantalla cuando se presione el boton
    } else {
      // Fue una pulsación larga
      globalButtonState = LONG_PRESS;
      needDisplayUpdate = true;
    }
  }
}

// Función de comparación para el ordenamiento (Mayor RSSI primero)
bool compareRSSI(const ScannedNetwork &a, const ScannedNetwork &b) {
  return a.rssi > b.rssi;
}

void saveNetwork(NetworkData newNet, int16_t currentRssi, uint8_t currentChannel) {
  bool found = false;

  for (int i = 0; i < foundNetworks.size(); i++) {
    if (foundNetworks[i].info.router == newNet.router) {
      foundNetworks[i].rssi = currentRssi;  // Actualizamos RSSI
      found = true;
      break;
    }
  }

  if (!found) {
    // Creamos el envoltorio
    ScannedNetwork scanned;
    scanned.info = newNet;
    scanned.rssi = currentRssi;
    scanned.channel = currentChannel;

    foundNetworks.push_back(scanned);
    Serial.printf("Nueva red: %s (RSSI: %d) [CANAL: %d] [PUBLICO: %s] \n",
                  newNet.SSID, currentRssi, currentChannel, newNet.isPublic ? "Si" : "No");
  }

  std::sort(foundNetworks.begin(), foundNetworks.end(), compareRSSI);
}

void handleNetworkSelectionMenu() {
  display.clear();
  display.setTextAlignment(TEXT_ALIGN_LEFT);
  display.drawString(0, 0, "== SELECT NETWORK ==");

  // Si no hay redes (por seguridad)
  if (foundNetworks.empty()) {
    display.drawString(0, 20, "There are no networks :(");
    Serial.println("No se encontraron redes. (manual)");
    display.display();
    delay(2000);
    lastSleepTime = millis();    // Marcamos hora de dormir
    currentState = STATE_SLEEP;  //Nos vamos a dormir, la proxima vez se intentara de nuevo
    needDisplayUpdate = true;

    return;
  }

  // --- LÓGICA DE BOTONES ---

  // 1. Pulsación CORTA -> Siguiente red (Scroll circular)
  if (globalButtonState == SHORT_PRESS) {
    selectedNetworkIndex++;
    if (selectedNetworkIndex >= foundNetworks.size()) {
      selectedNetworkIndex = 0;  // Volver al principio
    }
    globalButtonState = NO_PRESS;  // Consumir evento
  }

  // 2. Pulsación LARGA -> Seleccionar y Conectar
  if (globalButtonState == LONG_PRESS) {
    // Guardar selección
    selectedNW = foundNetworks[selectedNetworkIndex];
    TARGET_ROUTER_ID = selectedNW.info.router;
    memcpy(currentNetwork, selectedNW.info.SSID, SSID_LENGTH);
    Radio.SetChannel(channelList[selectedNW.channel]);  //Seteamos la radio a ese canal

    // Feedback visual
    display.clear();
    display.drawString(35, 25, "[Connecting]");
    display.display();
    delay(2000);

    globalButtonState = NO_PRESS;     // Consumir evento
    currentState = STATE_START_JOIN;  // <--- INICIAR PROCESO DE UNION
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

    // Construimos el texto base
    String linea = String(foundNetworks[currentIndex].info.SSID);
    linea += " (" + String(foundNetworks[currentIndex].rssi) + ")";
    linea += " [CH:" + String(foundNetworks[currentIndex].channel) + "]";

    // 1. Calculamos el ancho del texto en píxeles
    int textWidth = display.getStringWidth(linea);

    // 2. Calculamos la posición X del icono (1px margen inicial + texto + 5px de separacion)
    int iconX = 1 + textWidth + 5;

    // 3. Centramos el icono verticalmente (+2 px hacia abajo porque la línea mide 12 y el icono 8)
    int iconY = yPos + 2;

    const unsigned char *icono_actual = foundNetworks[currentIndex].info.isPublic ? icon_unlock : icon_lock;
    //Serial.print("La red es publica: ");
    //Serial.println(foundNetworks[currentIndex].info.isPublic);

    // --- DIBUJADO ---
    // Si es el seleccionado, lo pintamos INVERTIDO (Fondo blanco, texto e icono negro)
    if (currentIndex == selectedNetworkIndex) {

      display.setColor(WHITE);
      display.fillRect(0, yPos, 128, 12);  // Fondo blanco

      display.setColor(BLACK);
      display.drawString(1, yPos, linea);  // Texto negro

      // Dibujar el icono en NEGRO (Solo se dibujan los bits a '1' del array)
      display.drawXbm(iconX, iconY, emoji_width, emoji_height, icono_actual);

      display.setColor(WHITE);  // Restaurar color

    } else {
      // Normal: Texto e icono en blanco sobre fondo negro
      display.drawString(1, yPos, linea);
      display.drawXbm(iconX, iconY, emoji_width, emoji_height, icono_actual);
    }
  }

  display.display();
}

bool isForMe(size_t receiverId) {
  if (receiverId == MY_NODE_ID) {
    return true;
  } else {
    Serial.println("Se ha recibido un mensaje para otro destinatario. Ignorando...");
    return false;
  }
}

void applyConfig(ConfData config) {

  if (config.version <= 0 && config.version <= version) {  //Versiones 0 o negativas, versiones iguales o menores a la actual -> Ignorar
    Serial.println("Version de configuracion invalida, ingnorando configuracion...");
    return;
  }

  //Comprobamos que los datos no esten marcados como invalidos, en ese caso se mantiene la configuracion actual
  if (config.sendInterval > 0) {
    sendInterval = config.sendInterval * 60 * 1000;  //De minutos a milisegundos
  } else {
    Serial.println("Configuracion de sendInterval invalida. Ignorando...");
  }

  if (config.allowPublicConn > -1 && config.allowPublicConn <= 1) {
    allowPublicConn = config.allowPublicConn;
  } else {
    Serial.println("Configuracion de allowPublicConn invalida. Ignorando...");
  }

  //Una vez aplicado los cambios actualizamos la version de la mota:
  version = config.version;
  needDisplayUpdate = true;  //Si defaultMenu == 2 necesitara un refresco
}

/**
 * Comprueba si el canal está libre basándose en el RSSI actual.
 */
bool IsChannelFree() {

  int16_t currentRssi = Radio.Rssi(MODEM_LORA);

  if (currentRssi < RSSI_THRESHOLD) {
    return true;
  }

  return false;
}
