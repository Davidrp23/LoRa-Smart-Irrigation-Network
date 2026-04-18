#include "network.h"

//Router params
size_t connectedClients[MAX_CLIENTS];
std::vector<SensorsData> motasDataQueue; //Cola para almacenar los datos de las motas
std::vector<ConfData> motasConf; //Cola para almacenar las configuraciones de las motas

uint8_t activeClients = 0;
NetworkData NETWORK_DATA;

//--------------------------------------------------Clients Managment--------------------------------------------------

//Devuelve la posicion del cliente en la lista ( >= 0 ) si estaba presente, -1 en caso contrario
char getClientIndex(const size_t client){

  for(uint8_t c = 0 ; c < activeClients; c++ ){ //Para que no de muchas vueltas, en vez de poner MAX_CLIENT podemos poner el numero de clientes activos, pero debemos tener el buffer siempre compacto
    if(connectedClients[c] == client){                //Ver la funcion de eliminacion de clientes
      return c;
    }
  }
  return -1;
}

void addClient(const size_t client){
  connectedClients[activeClients] = client;
  activeClients++;
}

//Elimina un cliente. Coje al ultimo cliente de la lista y lo pone en la posicion del cliente que se va a eliminar, para tener siempre el array compacto.
bool deleteClient(const size_t client){

  char pos = getClientIndex(client);
  if(pos >= 0){
    connectedClients[pos] = connectedClients[activeClients - 1];
    connectedClients[activeClients - 1] = 0;
    activeClients--;
    return true;
  }
  return false;
}

void parseBigPacketResponse(String response){

  JsonDocument doc; // Json dinamico , version 7
  DeserializationError error = deserializeJson(doc, response);

  if (error) {
    Serial.print("Error al parsear el big-packet: ");
    Serial.println(error.c_str());
    return;
  }

  JsonArray confArray = doc["conf"];

  for (JsonObject item : confArray) {
    // Seguridad básica
    if (!item.containsKey("tg") || !item.containsKey("id")) continue; 

    const char* tag = item["tg"];
    
    if (strcmp(tag, "r") == 0) { //Aplicamos la configuracion del router

      if((size_t)item["id"] == routerId){ //Comprobamos que este router sea el target 
        
        uint16_t versionDeseada = (uint16_t)item["v"];

        if (item.containsKey("p")) { //Parametros de configuracion

          numChannel = item["p"]["c"] | numChannel;
          channel = channelList[numChannel];
          isPublic = item["p"]["eP"] | isPublic;

          if(item["p"].containsKey("s")){
            // Usar strncpy es más seguro que mempcpy para cadenas de texto
            strncpy(SSID, item["p"]["s"], SSID_LENGTH - 1);
            SSID[SSID_LENGTH - 1] = '\0'; // Asegurar el terminador nulo
          }

          //Actualizamos NETWORK_DATA usado en los beacon frames
          strncpy(NETWORK_DATA.SSID, SSID, SSID_LENGTH);
          NETWORK_DATA.isPublic = isPublic;
        }

        Radio.SetChannel( channel );
        version = versionDeseada; //Una vez aplicamos los cambios actualizamos la version
        Serial.println("Configuracion de Router actualizada.");
      }

    }
    else if (strcmp(tag, "m") == 0) { // Aplicamos la configuración para motas
      
      size_t targetMoteId = item["id"];
      int index = -1;

      // 1. Buscamos si la mota ya tiene una configuración en la cola
      for (size_t i = 0; i < motasConf.size(); i++) {
        if (motasConf[i].id == targetMoteId) {
          index = i;
          break;
        }
      }

      // 2. Si la mota NO existe en nuestra lista
      if (index == -1) {
        
        // Comprobamos el límite de MAX_CLIENTS
        if (motasConf.size() >= MAX_CLIENTS) {
          Serial.printf("Aviso: No se pueden guardar más configs (Max %d alcanzado).\n", MAX_CLIENTS);
          continue; // Pasamos a la siguiente iteración del for
        }

        ConfData nuevaConf;
        nuevaConf.router = routerId; // Siempre asignamos el ID de este router
        nuevaConf.id = targetMoteId;
        nuevaConf.version = item["v"];

        nuevaConf.sendInterval = 0; // 0 significará "Mantener actual", no tiene sentido un sendInterval de 0 minutos
        nuevaConf.allowPublicConn = -1; // La mota mantiene su configuracion por defecto
        
        if (item.containsKey("p")) {
          if (item["p"].containsKey("f")) {
            nuevaConf.sendInterval = item["p"]["f"];
          }
          if (item["p"].containsKey("cP")) {
            nuevaConf.allowPublicConn = item["p"]["cP"];
          }
        }

        motasConf.push_back(nuevaConf);

      } 
      // 3. Si la mota YA existe, actualizamos SOLO los valores que vengan en el JSON
      else {
        
        if (item.containsKey("v")) {
          motasConf[index].version = item["v"];
        }

        if (item.containsKey("p")) {
          // Comprobamos explícitamente cada campo para no sobreescribir con 0/false si falta
          if (item["p"].containsKey("f")) {
            motasConf[index].sendInterval = item["p"]["f"];
          }
          if (item["p"].containsKey("cP")) {
            motasConf[index].allowPublicConn = item["p"]["cP"];
          }
        }
      }
    }
  }
  if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
    shared_waiting_conf = motasConf.size();
    xSemaphoreGive(statsMutex);
  }
}

//Funcion para buscar la configuracion de una mota, devuelve su configuracion pendiente o una configuracion con id = 0 en caso contrario 
ConfData searchMotaConf(size_t id) {
  for (size_t i = 0; i < motasConf.size(); i++) {
    if (motasConf[i].id == id) {
      return motasConf[i];
    }
  }

  // Si no se encuentra:
  ConfData notFound;
  notFound.id = 0; 
  return notFound;
}

//Funcion para eliminar la configuracion de una mota
void deleteMotaConf(size_t id) {
  for (size_t i = 0; i < motasConf.size(); i++) {
    if (motasConf[i].id == id) {
      motasConf.erase(motasConf.begin() + i);
      if (xSemaphoreTake(statsMutex, (TickType_t)10) == pdTRUE) {
        shared_waiting_conf = motasConf.size();
        xSemaphoreGive(statsMutex);
      }
    }
  }
}
