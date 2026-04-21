//AMcontrol.cpp

#include "AMcontrol.h"

//Configurar los pines para el AM
void AMConf(){
  // Configuración de pines y puerto serie del AM-036
  pinMode(AM_MOSFET_PIN, OUTPUT);
  digitalWrite(GPS_MOSFET_PIN, LOW); // Asegurar que el AM inicie apagado
  // Evitamos inicializar el Serial aquí para no dejar los pines en estado ALTO
  pinMode(AM_TX_PIN, INPUT);
  pinMode(AM_RX_PIN, INPUT);

  // Asignamos las funciones callback a la librería
  am036.setCallbacks(onAMStatusChange, onAMSendCompleted);
}

void AMinit(){
  // Encendemos el AM
  am036.powerOn();
  delay(2000); //Esperamos a que el AM imprima la basura al iniciar

  // Iniciamos el AM
  am036.begin(115200, RX_PIN, TX_PIN);
}

bool checkConditions(){
  //Condiciones de envio de datos/telemetria:
  //1- Ha pasado mas de 1h desde que el paquete mas antiguo llego
  //2- Se ha superado un numero de paquetes en cola igual o mayor al maximo numero de clientes
  //3- Ha pasado 12h desde la ultima vez que envio datos al servidor (mantener telemetria del router -> bateria, señal , estado...)

  bool res = false;

  //Adquirimos el mutex y comprobamos
  res = first_packet_timestamp >= pdMS_TO_TICKS(ONE_HOUR_MILLIS) || shared_queueSize >= MAX_CLIENTS || last_dataSend_timestamp >= pdMS_TO_TICKS(TWELVE_HOURS_MILLIS);

  return res;

}

//Tarea encargada de comprobar las condiciones de envio de datos y telemetria asi como de gestionar el AM-036 con ese fin
void uplink_manager_task(void *pvParameters){
  
  last_execution_uplink_manager_task = xTaskGetTickCount();

  bool needSendData = false;
  needSendData = checkConditions();

  if(needSendData){

    AMinit();

    while(!received && last_execution_uplink_manager_task < pdMS_TO_TICKS(TWO_MINUTES_MILLIS) ){ //Mientras no se haya enviado y se este dentro del timeout
      
      //Actualizar el estado del AM-036
       am036.update();

      if(canSend){
        //Hacer el bigPacket
        String jsonString;
        // Le pasamos el payload a la librería
        if (am036.sendBigPacket(jsonString)) {
          Serial.println("[UPLINK_MANAGER_TASK] Paquete enrutado al AM-036 exitosamente.");
          canSend = false; // Bloqueamos hasta que el callback nos avise del resultado HTTP
        } else {
          Serial.println("[UPLINK_MANAGER_TASK] Fallo interno: No se pudo enrutar el paquete.");
          // Esperar 10 segundos
          vTaskDelay(pdMS_TO_TICKS(10000));
        }

      }
      vTaskDelay(pdMS_TO_TICKS(1000)); //1 segundo
    }

    //Apagamos el AM-036
    am036.powerOff();
    //Limpiamos las banderas
    canSend=false;
    received=false;
    //Limpiamos la respuesta del servidor
    respuestaStr = "";

  }
  vTaskDelayUntil(&last_execution_uplink_manager_task, pdMS_TO_TICKS(TEN_MINUTES_MILLIS)); //Esperamos 10 minutos desde que se ejecuto la tarea.
}

// Se dispara cuando el AM-036 consigue red GPRS o la pierde
void onAMStatusChange(bool isReady, int csq) {
  if (isReady) {
    canSend = true;
  }else{
    canSend = false;
  }
}

// Se dispara cuando el AM-036 termina de procesar el HTTP POST
void onAMSendCompleted(bool ok, int httpCode, JsonDocument& responseDoc) {
  
  if (ok && responseDoc.containsKey("response")) {
    // Si el servidor nos devolvió algo útil (ej. comandos downlink)
    serializeJson(responseDoc["response"], respuestaStr);
    Serial.println("[MAIN] Cuerpo de la respuesta del servidor: " + respuestaStr);
    received = true;
  }

  // Liberamos la bandera para poder enviar el siguiente paquete cuando toque
  canSend = false; 

}