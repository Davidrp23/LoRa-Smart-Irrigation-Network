#include "config.h"
#include "lora_router.h"
#include "AMcontrol.h"
#include <mbedtls/aes.h>

const unsigned char crypto_key[16] = "59mkla3Qh0kC0eR";
const unsigned char crypto_iv[16] = {0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
                                     0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C,
                                     0x0D, 0x0E, 0x0F, 0x10};

void processCrypto(uint8_t *payload, size_t length) {
  mbedtls_aes_context aes;
  mbedtls_aes_init(&aes);
  mbedtls_aes_setkey_enc(&aes, crypto_key, 128);

  unsigned char iv_copy[16];
  memcpy(iv_copy, crypto_iv, 16);

  unsigned char stream_block[16];
  size_t nc_off = 0;

  mbedtls_aes_crypt_ctr(&aes, length, &nc_off, iv_copy, stream_block, payload,
                        payload);
  mbedtls_aes_free(&aes);
}

static RadioEvents_t RadioEvents;
QueueHandle_t rxQueue; //Cola para recibir los mensajes (definido en setup())

void initializeLora() {
  RadioEvents.TxDone = OnTxDone;
  RadioEvents.TxTimeout = OnTxTimeout;
  RadioEvents.RxDone = OnRxDone;

  Radio.Init(&RadioEvents);
  Radio.SetChannel(channel);
  Radio.SetTxConfig(MODEM_LORA, TX_OUTPUT_POWER, 0, LORA_BANDWIDTH,
                    LORA_SPREADING_FACTOR, LORA_CODINGRATE,
                    LORA_PREAMBLE_LENGTH, LORA_FIX_LENGTH_PAYLOAD_ON, true, 0,
                    0, LORA_IQ_INVERSION_ON, 3000);

  Radio.SetRxConfig(MODEM_LORA, LORA_BANDWIDTH, LORA_SPREADING_FACTOR,
                    LORA_CODINGRATE, 0, LORA_PREAMBLE_LENGTH,
                    LORA_SYMBOL_TIMEOUT, LORA_FIX_LENGTH_PAYLOAD_ON, 0, true, 0,
                    0, LORA_IQ_INVERSION_ON, true);
  Radio.Rx(0);
}

void OnTxDone(void) {

  Serial.println("TX done......");

  if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
    shared_tx++;
    xSemaphoreGive(statsMutex);
  }

  Radio.Rx(0);
  xSemaphoreGive(loraTxSemaphore); // Liberar la radio para otra transmisión
}

void OnTxTimeout(void) {
  Serial.print("TX Timeout......");

  if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
    shared_tx_err++;
    xSemaphoreGive(statsMutex);
  }

  // De momento si ocurre esto, no enviaremos respuesta.
  Radio.Rx(0);
  xSemaphoreGive(loraTxSemaphore); // Liberar la radio tras el error
}

void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr) {
  // --- Contexto de tarea (loop → Radio.IrqProcess → callback) ---
  // OnRxDone NO es una ISR real. El SX1262 genera una interrupción hardware
  // que solo pone un flag interno; Radio.IrqProcess() (llamado en loop())
  // comprueba ese flag y ejecuta este callback en contexto de tarea normal.
  //
  // Aquí NO se hace ningún procesamiento pesado. Solo copiamos los bytes
  // del buffer efimero del driver a un RxRawPacket y lo metemos en la cola.
  // Toda la validacion, checksum, crypto y logica de protocolo la hace
  // loraRxProcessTask en su propio contexto de tarea.

  RxRawPacket pkt;
  // Nos aseguramos de no desbordar el buffer del paquete crudo
  uint16_t copyLen = min((uint16_t)sizeof(pkt.raw), size);
  memcpy(pkt.raw, payload, copyLen);
  pkt.size = size;   // Guardamos el tamanio REAL para que la tarea lo valide
  pkt.rssi = rssi;
  pkt.snr  = snr;

  // Enviamos al contexto de tarea sin bloquear (timeout = 0)
  // Usamos xQueueSend (no FromISR) porque estamos en contexto de tarea.
  if (xQueueSend(rxQueue, &pkt, (TickType_t)0) != pdTRUE) {
    // La cola esta llena: incrementamos el contador de error de RX
    if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
      shared_rx_err++;
      xSemaphoreGive(statsMutex);
    }
    Serial.println("[OnRxDone] Cola rxQueue llena! Paquete descartado.");
  }
}

// ============================================================
// TAREA: loraRxProcessTask
// Bloquea sobre rxQueue y procesa cada paquete LoRa recibido:
//  1. Comprueba tamaños (MIN_PACKET_SIZE, longitud por header)
//  2. Valida checksum
//  3. Desencripta el payload (AES-CTR)
//  4. Actualiza contadores de estadisticas (statsMutex)
//  5. Llama a process() con el LoRaMessage ya verificado
// ============================================================
void loraRxProcessTask(void *pvParameters) {

  // Define el tamaño minimo de un paquete (Headers sin payload):
  // messageType (1B) + length (1B) + fcnt (4B) + checksum (2B) = 8 bytes
  const size_t MIN_PACKET_SIZE =
      sizeof(messageType) + sizeof(uint8_t) + sizeof(uint32_t) +
      sizeof(uint16_t);

  RxRawPacket pkt;

  for (;;) {
    // Bloqueamos hasta que haya un paquete en la cola (espera indefinida)
    if (xQueueReceive(rxQueue, &pkt, portMAX_DELAY) == pdTRUE) {

      const uint16_t size = pkt.size;

      if (size >= MIN_PACKET_SIZE) {

        // Reconstruimos el LoRaMessage a partir de los bytes crudos
        LoRaMessage incomingMessage;
        memcpy(
            &incomingMessage, pkt.raw,
            min((size_t)size, (size_t)MIN_PACKET_SIZE + (size_t)MAX_PAYLOAD_SIZE));

        size_t expectedSize = MIN_PACKET_SIZE + incomingMessage.length;

        if (size == expectedSize) {

          uint16_t expectedChecksum = calculateChecksum(incomingMessage);

          if (expectedChecksum == incomingMessage.checksum) {

            if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
              shared_rx++;
              shared_rssi = pkt.rssi;
              xSemaphoreGive(statsMutex);
            }

            if (incomingMessage.length > 0) {
              Serial.println(
                  "[CRYPTO] Checksum valido. Desencriptando payload RX...");
              processCrypto(incomingMessage.data.raw, incomingMessage.length);
            }

            // Debug
            packageToSerial(incomingMessage, size, pkt.rssi, pkt.snr);

            process(incomingMessage);

          } else {

            // Checksum invalido, hay datos corruptos

            if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
              shared_rx_err++;
              shared_crc_err++;
              xSemaphoreGive(statsMutex);
            }

            Serial.print("Error de checksum, checksum del mensaje: ");
            Serial.print(incomingMessage.checksum);
            Serial.print(", checksum calculado: ");
            Serial.println(expectedChecksum);
          }

        } else {
          // El campo 'length' indica X, pero el paquete recibido era Y. Error de
          // protocolo.

          if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
            shared_rx_err++;
            xSemaphoreGive(statsMutex);
          }

          Serial.print("Error de longitud en el protocolo! Paquete real: ");
          Serial.print(size);
          Serial.print(", Esperado por Header: ");
          Serial.println(expectedSize);
        }

      } else if (size > 0) {
        // Paquete demasiado pequenio para siquiera contener los headers (corrupto)

        if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
          shared_rx_err++;
          xSemaphoreGive(statsMutex);
        }

        Serial.print("Paquete demasiado corto (");
        Serial.print(size);
        Serial.print(" bytes). Minimo: ");
        Serial.print(MIN_PACKET_SIZE);
        Serial.println(" bytes.");
      }
    }
  }
}

void process(LoRaMessage incomingPackage) {

  if (incomingPackage.type ==
      messageType::BEACON_REQUEST) { // El nodo solicita un BEACON_RESPONSE para
                                     // descubir nuevos routers. -- RECIBE UN
                                     // MENSAJE "BROADCAST"

    sendBeaconResponse();

  } else { // RECIBE UN MENSAJE "DIRIGIDO"

    // Para todos los tipos excepto DATA, la carga util del paquete se
    // interpreta como un ControlData, para recurperar el id y el router da
    // igual como interpretemos el union ya que en los 2 casos se encuentran en
    // la misma posicion.

    const size_t CLIENT_ID = incomingPackage.data.ControlData.id;
    const size_t DESTINATION_ROUTER = incomingPackage.data.ControlData.router;

    if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
      shared_lastClient = CLIENT_ID;
      xSemaphoreGive(statsMutex);
    }

    if (DESTINATION_ROUTER == routerId) {

      Serial.println("Se ha recibido un paquete con destino este router.");

      // === VALIDACION GLOBAL ANTI-REPLAY ===
      if (incomingPackage.type != messageType::JOIN_REQUEST &&
          incomingPackage.type != messageType::INVALID) {
        uint32_t incomingFCnt = incomingPackage.fcnt;
        char cryptoIdx = getClientCryptoStateIndex(CLIENT_ID);
        
        xSemaphoreTake(networkMutex, portMAX_DELAY);
        uint32_t lastFCnt = clientCryptoStates[cryptoIdx].lastFCnt;

        if (lastFCnt != 0 && incomingFCnt <= lastFCnt) {
          xSemaphoreGive(networkMutex);
          Serial.printf("[CRYPTO] Desincronización o REPLAY detectado! MsgID "
                        "%u (Ultimo %u). Solicitando re-join...\n",
                        incomingFCnt, lastFCnt);
          sendControlPacket(messageType::CRYPTO_ERROR, CLIENT_ID);
          if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
            shared_crypto_err++;
            xSemaphoreGive(statsMutex);
          }
          return; // Ignoramos el paquete malicioso
        }
        clientCryptoStates[cryptoIdx].lastFCnt = incomingFCnt;
        xSemaphoreGive(networkMutex);
      }

      switch (incomingPackage.type) {

        // Para no formar bucles infinitos, el nodo y el router tendran 3 ciclos
        // para completar la comunicacion, en caso de 3 fallos reiterados se
        // cancelara la comunicacion

      case messageType::DATA: // El nodo adjunta datos recolectado por sus
                              // sensores
      {
        if (getClientIndex(CLIENT_ID) == (char)-1) {
          Serial.println("Se ha recibido un paquete de datos de una mota que "
                         "NO estaba en la red, enviando respuesta...");
          sendControlPacket(
              messageType::JOIN_REQUEST,
              CLIENT_ID); // El JOIN_REQUEST solo lo envia la mota para
                          // conectarse a la red que gestiona el router, cuando
                          // el router lo envia como
          // respuesta a un paquete anterior quiere decir que se requiere unirse
          // a la red para enviar ese paquete (porque no lo esta actualmente),
          // la mota interpretara ese paquete como que no esta en la red, pero
          // deberia estarlo, por algun motivo se ha perdido la lista de
          // clientes conectados, asi que enviara de vuelta un JOIN_REQUEST para
          // unirse de nuevo a la misma. No se tendra en cuenta la trama de
          // datos en estos casos.
        } else {
          Serial.println(
              "Se ha recibido un paquete de datos. Guardando en cola local...");

          // 1. Modificamos el vector de forma segura (Solo el Core 1 está
          // tocando esto)
          if (motasDataQueue.size() >= MAX_MOTAS_EN_COLA) {
            motasDataQueue.erase(motasDataQueue.begin());

            // Actualizamos estadística de desbordamiento de cola
            if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
              shared_queueFull++;
              xSemaphoreGive(statsMutex);
            }
          }
          motasDataQueue.push_back(incomingPackage.data.SensorsData);

          // 2. Actualizamos la variable para la pantalla OLED (Protegida)
          if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
            shared_queueSize = motasDataQueue.size();
            // Registramos el timestamp del primer paquete pendiente (para trigger de uplink)
            if (shared_firstPktTimestamp == 0) {
              shared_firstPktTimestamp = xTaskGetTickCount();
            }
            xSemaphoreGive(statsMutex);
          }

          // 3. Miramos si para la mota hay una configuracion pendiente:
          ConfData configMota = searchMotaConf(CLIENT_ID);

          if (configMota.id !=
              0) { // La mota tiene una configuracion pendiente, se la enviamos,
                   // ademas con esto hacemos un ack implicito (piggybacking)
            sendConfigPacket(configMota);
            // No eliminamos la configuracion hasta recibir DATA_CONF_ACK
          } else { // No hay configuracion para la mota, ack normal
            sendControlPacket(messageType::DATA_ACK, CLIENT_ID);
          }
        }
        break;
      }

      case messageType::JOIN_REQUEST: // El nodo solicita unirse a la red
                                      // gestionada por este router, aceptamos o
                                      // denegamos empleando las cabeceras
                                      // adecuadas
      {
        uint32_t incomingJoinCnt = incomingPackage.fcnt;
        char cryptoIdx = getClientCryptoStateIndex(CLIENT_ID);

        xSemaphoreTake(networkMutex, portMAX_DELAY);
        if (clientCryptoStates[cryptoIdx].lastJoinCnt != 0 &&
            incomingJoinCnt <= clientCryptoStates[cryptoIdx].lastJoinCnt) {
          xSemaphoreGive(networkMutex);
          Serial.printf("[CRYPTO] Ataque de REPLAY detectado en JOIN_REQUEST! "
                        "JoinCnt repetido o antiguo: %u. Descartando...\n",
                        incomingJoinCnt);
          sendControlPacket(messageType::JOIN_DENIED, CLIENT_ID);
          if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
            shared_crypto_err++;
            xSemaphoreGive(statsMutex);
          }
          break;
        }
        clientCryptoStates[cryptoIdx].lastJoinCnt = incomingJoinCnt;
        clientCryptoStates[cryptoIdx].lastFCnt = 0;
        xSemaphoreGive(networkMutex);

        // Comprobamos la lógica de red pública/privada
        if (isPublic) {
          // RED PÚBLICA: Se acepta siempre si no se ha alcanzado el límite de clientes
          Serial.printf("El router es publico. Aceptando peticion de union del nodo %zu directamente.\n", CLIENT_ID);
          
          if (getClientIndex(CLIENT_ID) == (char)-1) {
            int8_t copy_connectedClients = MAX_CLIENTS;
            if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
              copy_connectedClients = shared_connectedClients;
              xSemaphoreGive(statsMutex);
            }

            if (copy_connectedClients >= MAX_CLIENTS) {
              Serial.printf("Numero maximo de clientes conectados, rechazando mota con ID: %zu \n", CLIENT_ID);
              sendControlPacket(messageType::JOIN_DENIED, CLIENT_ID);
              break;
            }

            if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
              shared_connectedClients++; 
              xSemaphoreGive(statsMutex);
            }

            addClient(CLIENT_ID);
            Serial.printf("El nodo %zu se ha conectado a la red.\n", CLIENT_ID);
          } else {
            Serial.printf("El nodo %zu ya estaba conectado.\n", CLIENT_ID);
          }
          sendControlPacket(messageType::JOIN_ACCEPTED, CLIENT_ID);
        } else {
          // RED PRIVADA: Consultar al backend mediante el AM-036
          Serial.printf("El router es privado. Consultando backend para el nodo %zu...\n", CLIENT_ID);
          
          if (getClientIndex(CLIENT_ID) != (char)-1) {
             // Ya está en la red, aceptamos (o podríamos re-verificar, pero asumimos que si está ya fue verificado)
             Serial.printf("El nodo %zu ya estaba conectado a la red privada.\n", CLIENT_ID);
             sendControlPacket(messageType::JOIN_ACCEPTED, CLIENT_ID);
          } else {
             // Encolar el trabajo de verificación
             if (!enqueueAccessCheck(CLIENT_ID)) {
                Serial.printf("Error: no se pudo encolar la verificacion para el nodo %zu. Rechazando por defecto.\n", CLIENT_ID);
                sendControlPacket(messageType::JOIN_DENIED, CLIENT_ID);
             } else {
                Serial.printf("Trabajo de verificacion encolado. Esperando respuesta asincrona para el nodo %zu...\n", CLIENT_ID);
             }
          }
        }
        break;
      }

      case messageType::NODE_LEAVING: // El nodo solicita salirse de la Red que
                                      // gestiona este router, el router envia
                                      // NODE_LEAVING_ACK para aceptar la salida
                                      // del nodo y terminar la comunicacion
        Serial.printf("El nodo %zu esta intentando desconectarse de la red.\n",
                      CLIENT_ID);

        // Comprobamos si el cliente esta conectado ya a la red
        if (getClientIndex(CLIENT_ID) == (char)-1) {
          // El nodo no estaba en la red, no hacemos nada.
          Serial.printf("El nodo %zu se ha intentado desconectarse de la red, "
                        "pero no estaba en ella.\n",
                        CLIENT_ID);
        } else {
          Serial.printf("El nodo %zu se ha desconectado de la red.\n",
                        CLIENT_ID);
          // Le respondemos que su solicitud de abandonar la red ha sido
          // procesada con exito
          deleteClient(CLIENT_ID);
          if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
            shared_connectedClients--;
            if (shared_connectedClients < 0)
              shared_connectedClients = 0; // Por si acaso
            xSemaphoreGive(statsMutex);
          }
        }
        sendControlPacket(
            messageType::NODE_LEAVING_ACK,
            CLIENT_ID); // Le hacemos llegar que hemos recibido el mensaje
        break;

      case messageType::DATA_CONF_ACK: // La mota indica que recibio y aplico la
                                       // configuracion, el router puede
                                       // eliminar la configuracion de esa mota
                                       // de la cola de confg pendientes
        Serial.printf("La mota con ID: %zu ha respondido que ha recibido la "
                      "configuracion. Eliminando configuracion de la cola...\n",
                      CLIENT_ID);
        deleteMotaConf(CLIENT_ID);
        break;

      case messageType::INVALID: // El nodo envia INVALID, lo que quiere decir
                                 // que el ultimo mensaje que enviamos estaba
                                 // malformado o se corrompio por el camino.
        Serial.println("La mota ha respondido que el ultimo paquete que "
                       "recibio es invalido, posible colision.");
        break;

      default: // Caso no esperado
        Serial.printf("El router ha recibido un paquete de tipo %X, lo cual no "
                      "estaba previsto.\n",
                      incomingPackage.type);
        break;
      }

    } else {
      Serial.printf("Este router ha recibido un paquete para el router con ID: "
                    "%zu, descartando...\n",
                    DESTINATION_ROUTER);
    }
  }
}

// Función de CRC-16/CCITT-FALSE (una implementación común)
uint16_t calculateChecksum(LoRaMessage msg) {

  const size_t buffSize =
      sizeof(msg.type) + sizeof(msg.length) + sizeof(msg.fcnt) + msg.length;
  uint8_t buff[buffSize];

  // Metemos todos los datos del msg lora en un buffer
  // Calculo el checksum de todos los campos menos del propio checksum, una
  // forma seria poner el checksum al final (del struct) y excluirlo, pero el
  // campo data es variable por lo que debe ir al final.
  size_t offset = 0;
  memcpy(buff + offset, &msg.type, sizeof(msg.type));
  offset += sizeof(msg.type);
  memcpy(buff + offset, &msg.length, sizeof(msg.length));
  offset += sizeof(msg.length);
  memcpy(buff + offset, &msg.fcnt, sizeof(msg.fcnt));
  offset += sizeof(msg.fcnt);
  memcpy(buff + offset, &msg.data, msg.length);

  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < sizeof(buff); i++) {
    crc ^= (uint16_t)buff[i] << 8;
    for (int j = 0; j < 8; j++) {
      if (crc & 0x8000)
        crc = (crc << 1) ^ 0x1021; // Polinomio CRC-16/CCITT
      else
        crc <<= 1;
    }
  }
  return crc;
}

void encryptAndMAC(LoRaMessage &msg) {
  if (msg.length > 0) {
    Serial.printf("[CRYPTO] Encriptando payload TX de %d bytes...\n",
                  msg.length);
    processCrypto(msg.data.raw, msg.length);
  }
  msg.checksum = calculateChecksum(msg);
}

// Esta funcion tiene como parametro el tipo de mensaje y el ID del nodo
// destinatario. Envia un paquete de control del tipo seleccionado al cliente
// seleccionado
void sendControlPacket(messageType type, size_t clientID) {

  xSemaphoreTake(loraTxSemaphore, portMAX_DELAY); // Wait for the radio to be free
  Radio.Sleep(); // Quitamos la radio del modo escucha

  // Formamos el paquete.
  LoRaMessage msg;
  msg.type = type;

  ControlData cdata;
  cdata.id = clientID;
  cdata.router = routerId;

  msg.length = sizeof(ControlData); // Tamaño de la carga util
  msg.data.ControlData = cdata;

  encryptAndMAC(msg);

  // Calcular el tamaño exacto del paquete.
  // No vamos a enviar el tamaño completo del struct (244B) ya que el mensaje
  // puede que no contenga el maximo tamaño posible (controldata vs sensordata)
  // y estariamos desperdiciando tiempo valioso de trasmision En lugar de enviar
  // paquetes estaticos de 244B enviaremos paquetes dinamicos para aprovechar
  // mejor el tiempo de trasmision

  // Calcula el tamaño real de los datos a transmitir:
  // 1 (type) + 1 (length) + 4 (fcnt) + msg.length (datos reales) + 2 (checksum)

  const size_t headers = sizeof(msg.type) + sizeof(msg.length) +
                         sizeof(msg.fcnt) + sizeof(msg.checksum);

  const size_t realPacketSize = headers + msg.length; // Carga util + headers

  Serial.print("Enviando paquete binario de ");
  Serial.print(realPacketSize);
  Serial.println(" bytes...");

  // --- Transmisión ---
  int8_t attempts = 3; // Intentos para trasmitir, si en los 3 (con esperas
                       // aleatorias) falla, cancelamos y devolvemos false
  delay(50); // jitter de espera  antes de enviar, por si acabamos de recibir un
             // mensaje, esperamos a que el ruido se vaya.
  while (attempts > 0) {

    if (IsChannelFree()) {
      Radio.Send((uint8_t *)&msg, realPacketSize);
      return; // The semaphore will be given back in OnTxDone / OnTxTimeout
    } else {
      int16_t currentRssi = Radio.Rssi(MODEM_LORA);
      Serial.printf("DEBUG -> Intento %d: Canal ocupado. RSSI actual: %d dBm "
                    "(Límite: %d)\n",
                    4 - attempts, currentRssi, RSSI_THRESHOLD);
      delay(random(
          50, 200)); // jitter de espera aleatoria para iniciar un nuevo intent
      shared_channelBusyErrors++;
    }
    attempts--;
  }

  Serial.printf("No se ha podido enviar el mensaje. Causa: Canal ocupado.\n");
  xSemaphoreGive(loraTxSemaphore); // Liberar si se abortó por ocupado
}

// Esta funcion tiene como parametro la configuracion de la mota. Envia el
// paquete de configuracion a la misma.
void sendConfigPacket(ConfData configMota) {

  xSemaphoreTake(loraTxSemaphore, portMAX_DELAY); // Wait for the radio to be free
  Radio.Sleep(); // Quitamos la radio del modo escucha

  // Formamos el paquete.
  LoRaMessage msg;
  msg.type = messageType::DATA_CONF;

  msg.length = sizeof(ConfData); // Tamaño de la carga util
  msg.data.ConfData = configMota;

  encryptAndMAC(msg);

  // Calcular el tamaño exacto del paquete.
  // No vamos a enviar el tamaño completo del struct (244B) ya que el mensaje
  // puede que no contenga el maximo tamaño posible (controldata vs sensordata)
  // y estariamos desperdiciando tiempo valioso de trasmision En lugar de enviar
  // paquetes estaticos de 244B enviaremos paquetes dinamicos para aprovechar
  // mejor el tiempo de trasmision

  // Calcula el tamaño real de los datos a transmitir:
  // 1 (type) + 1 (length) + 4 (fcnt) + msg.length (datos reales) + 2 (checksum)

  const size_t headers = sizeof(msg.type) + sizeof(msg.length) +
                         sizeof(msg.fcnt) + sizeof(msg.checksum);

  const size_t realPacketSize = headers + msg.length; // Carga util + headers

  Serial.print("Enviando paquete de conf binario de ");
  Serial.print(realPacketSize);
  Serial.println(" bytes...");

  // --- Transmisión ---
  int8_t attempts = 3; // Intentos para trasmitir, si en los 3 (con esperas
                       // aleatorias) falla, cancelamos y devolvemos false
  delay(50); // jitter de espera  antes de enviar, por si acabamos de recibir un
             // mensaje, esperamos a que el ruido se vaya.
  while (attempts > 0) {

    if (IsChannelFree()) {
      Radio.Send((uint8_t *)&msg, realPacketSize);
      return; // The semaphore will be given back in OnTxDone / OnTxTimeout
    } else {
      int16_t currentRssi = Radio.Rssi(MODEM_LORA);
      Serial.printf("DEBUG -> Intento %d: Canal ocupado. RSSI actual: %d dBm "
                    "(Límite: %d)\n",
                    4 - attempts, currentRssi, RSSI_THRESHOLD);
      delay(random(
          50, 200)); // jitter de espera aleatoria para iniciar un nuevo intent
      shared_channelBusyErrors++;
    }
    attempts--;
  }

  Serial.printf("No se ha podido enviar el mensaje. Causa: Canal ocupado.\n");
  xSemaphoreGive(loraTxSemaphore); // Liberar si se abortó por ocupado
}

// Esta funcion se usa para enviar un BEACON_RESPONSE cuando una mota lo
// solicita de forma previa con un BEACON_REQUEST Espera un tiempo aleatorio
// entre 50-200ms para que todos los routers en el mismo alcance no colisionen a
// la vez, la probabilidad de que 2 emitan a la vez es baja.
void sendBeaconResponse() {

  xSemaphoreTake(loraTxSemaphore, portMAX_DELAY); // Wait for the radio to be free
  Radio.Sleep(); // Quitamos la radio del modo escucha

  delay(random(50, 200)); // jitter de espera aleatoria para evitar colisiones
                          // con otros routers en el mismo alcance

  Serial.println("Enviando Beacon Response...");

  // Formamos el paquete.
  LoRaMessage msg;
  msg.type = messageType::BEACON_RESPONSE;
  msg.length = sizeof(NetworkData); // Tamaño de la carga util
  msg.data.NetworkData = NETWORK_DATA;

  encryptAndMAC(msg);

  const size_t headers = sizeof(msg.type) + sizeof(msg.length) +
                         sizeof(msg.fcnt) + sizeof(msg.checksum);

  const size_t realPacketSize = headers + msg.length; // Carga util + headers

  Serial.print("Enviando paquete binario de ");
  Serial.print(realPacketSize);
  Serial.println(" bytes...");

  // --- Transmisión ---
  int8_t attempts = 3; // Intentos para trasmitir, si en los 3 (con esperas
                       // aleatorias) falla, cancelamos y devolvemos false
  delay(50); // jitter de espera  antes de enviar, por si acabamos de recibir un
             // mensaje, esperamos a que el ruido se vaya.
  while (attempts > 0) {

    if (IsChannelFree()) {
      Radio.Send((uint8_t *)&msg, realPacketSize);
      return; // The semaphore will be given back in OnTxDone / OnTxTimeout
    } else {
      int16_t currentRssi = Radio.Rssi(MODEM_LORA);
      Serial.printf("DEBUG -> Intento %d: Canal ocupado. RSSI actual: %d dBm "
                    "(Límite: %d)\n",
                    4 - attempts, currentRssi, RSSI_THRESHOLD);
      delay(random(
          50, 200)); // jitter de espera aleatoria para iniciar un nuevo intent
      shared_channelBusyErrors++;
    }
    attempts--;
  }

  Serial.printf("No se ha podido enviar el mensaje. Causa: Canal ocupado.\n");
  xSemaphoreGive(loraTxSemaphore); // Liberar si se abortó por ocupado
}

char findChannelNumber(uint32_t ch) {
  char result = -1; // No encontrado por defecto
  for (char i = 0; i < NUM_CHANELS; i++) {
    if (ch == channelList[i]) {
      result = i;
      return result;
    }
  }
  return result;
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

void packageToSerial(LoRaMessage pkg, uint16_t size, int16_t rssi, int8_t snr) {

  Serial.println("\n--- PAQUETE LORA RECIBIDO ---");

  Serial.printf("Tamaño total del paquete recibido: %d Bytes\n", size);

  // 1. Imprimir el Tipo de Mensaje (Type)

  Serial.print("1. Tipo (Enum): ");

  Serial.println((uint8_t)pkg.type, HEX);

  // 2. Imprimir la Longitud de los Datos (Length)

  Serial.print("2. Longitud de datos (Bytes): ");

  Serial.println(pkg.length);

  // 3. Imprimir los Datos (Payload)

  Serial.print("3. Datos (Payload): ");

  if (pkg.type == messageType::DATA) {

    Serial.printf(
        "--- Data Package ---\n"
        "Router: %zu | ID: %zu | Hum: %d%% | Bat: %d%% | GPS: %.5f, %.5f | "
        "Ver: %u\n"
        "--- Telemetry ---\n"
        "RX/TX: %u/%u | RSSI: %d dBm | Errors (RX/TX/Busy/Ack): "
        "%u/%u/%u/%u\n\n",
        pkg.data.SensorsData.router, pkg.data.SensorsData.id,
        pkg.data.SensorsData.humidity, pkg.data.SensorsData.battery,
        pkg.data.SensorsData.latitude, pkg.data.SensorsData.longitude,
        pkg.data.SensorsData.version, pkg.data.SensorsData.receivedPackets,
        pkg.data.SensorsData.sendedPackets, pkg.data.SensorsData.lastRssi,
        pkg.data.SensorsData.rx_err, pkg.data.SensorsData.tx_err,
        pkg.data.SensorsData.channelBusyErrors,
        pkg.data.SensorsData.missingAckErrors);

  } else if (pkg.type == messageType::BEACON_REQUEST) {

    Serial.println("Se ha recibido un BEACON REQUEST.");

  } else { // Packetes de control

    Serial.printf("Router: %zu | ID: %zu \n", pkg.data.ControlData.router,
                  pkg.data.ControlData.id);
  }
  // 4. Imprimir el Checksum (sin verificación por ahora)

  Serial.print("4. Checksum (Recibido): 0x");

  Serial.println(pkg.checksum, HEX);

  // 5. Imprimir el RSSI

  Serial.print("5. RSSI: ");

  Serial.println(rssi);

  // 6. SNR
  Serial.printf("6. SNR: %d\n", snr);
}
