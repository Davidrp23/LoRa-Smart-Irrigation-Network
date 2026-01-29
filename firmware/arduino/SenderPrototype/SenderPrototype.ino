//SenderPrototype.ino


//---------------------------------------------------PARAMETERS------------------------------------------------------------------

#include "esp_sleep.h"
#include "Battery.h"
#include "Oled.h"
#include "Types.h"
#include "LoRaWan_APP.h"


// Define the GPIO pin and level for the button

#define BUTTON_WAKEUP_PIN GPIO_NUM_2

#define BUTTON_WAKEUP_LEVEL 1 // 1 for HIGH, 0 for LOW (depending on your wiring)

const int TIME_TO_SLEEP = 3600;   // Sleep for 1 h



//-----------------------------------------------------SETUP----------------------------------------------------------------

void setup() {

  //Habilitamos la alimentacion a los perifericos de la placa
  VextON();

  delay(500);

  //Habilitamos el ADC
  EnableADC();
  
  Serial.begin(115200);

  delay(100);

  //Iniciamos LoRa
  lora_init();

  pinMode(35,OUTPUT); //LED PIN

  delay(1000);

  // Configuración de pines analogicos, resolucion 12 bits
  analogReadResolution(12);

  // Determine the cause of the reset
  esp_sleep_wakeup_cause_t wake_reason = esp_sleep_get_wakeup_cause();
  
  // Logic to execute on button press wake-up

  if (wake_reason == ESP_SLEEP_WAKEUP_TIMER) {
    
    Serial.println("Woke up due to timmer. Sending data to router...");
    
    for(int i=0; i<10; i++){
      digitalWrite(35,HIGH);
      delay(100);
      digitalWrite(35,LOW);
      delay(100);
    }
    
    
  }else if (wake_reason == ESP_SLEEP_WAKEUP_EXT0) {
    
    Serial.println("Woke up due to external pin (Button press). Showing display...");

    // 1. Gather the necessary data 
    senderStatus senderST = getSenderStatus();
    // 2. Display the data
    initializeOled();
    showOled(senderST);
    delay(4000);
    


  } else if (wake_reason == ESP_SLEEP_WAKEUP_UNDEFINED) {
      
    Serial.println("Initial power-on or hard reset.");
    // No action is performed on initial boot.
    
  } else {
      
    Serial.println("Other wake-up reason.");
    
  }

}

//---------------------------------------------------LOOP------------------------------------------------------------------

void loop() {
  
  deepSleep();

}

//---------------------------------------------------DEEPSLEEP------------------------------------------------------------------

void deepSleep(){

  VextOFF(); //Apagamos los perifericos de la placa
	Radio.Sleep(); //Apagamos la radio
	SPI.end(); //Terminamos las comunicaciones SPI

  //Ponemos los pines en analogico para reducir el consumo
	pinMode(RADIO_DIO_1,ANALOG);
	pinMode(RADIO_NSS,ANALOG);
	pinMode(RADIO_RESET,ANALOG);
	pinMode(RADIO_BUSY,ANALOG);
	pinMode(LORA_CLK,ANALOG);
	pinMode(LORA_MISO,ANALOG);
	pinMode(LORA_MOSI,ANALOG);

  // THE COMPILER REQUIRES THIS FUNCTION TO BE DEFINED.
  // It only configures and enters deep sleep.
  
  const uint64_t uS_TO_S_FACTOR = 1000000;  // Conversion factor for seconds to microseconds

  Serial.println("Entering Deep Sleep for " + String(TIME_TO_SLEEP) + " seconds or until button press...");
  
  // 1. Configure Timer Wake-up
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
  
  // 2. Configure External (Button) Wake-up
  esp_sleep_enable_ext0_wakeup(BUTTON_WAKEUP_PIN, BUTTON_WAKEUP_LEVEL); 

  // 3. Enter deep sleep
  
  esp_deep_sleep_start();
  
  // Note: Execution restarts from setup() after this.

}

//---------------------------------------------------GETSENDERSTATUS------------------------------------------------------------------

senderStatus getSenderStatus(){

  senderStatus senderST;
  batteryStatus senderBattery;
  // 1. Gather the necessary data 
  senderBattery = checkBatteryStatus();
  senderST.battery = senderBattery;

  return senderST;
}

//---------------------------------------------------------VEXTON-----------------------------------------------------------------------

void VextON(void)
{
  pinMode(Vext,OUTPUT);
  digitalWrite(Vext, LOW);
}

//-----------------------------------------------------------VEXTOFF----------------------------------------------------------

void VextOFF(void) //Vext default OFF
{
  pinMode(Vext,OUTPUT);
  digitalWrite(Vext, HIGH);
}

//------------------------------------------------------------ENABLEADC---------------------------------------------------------

void EnableADC(){
  // Set pin 37 as an output pin (used for ADC control):
  pinMode(37, OUTPUT);

  // Set pin 37 to HIGH (enable ADC control):
  digitalWrite(37, HIGH);
}

//---------------------------------------------------------------LORAINIT------------------------------------------------------

void lora_init(void)
{
  Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);
  static RadioEvents_t RadioEvents;

  RadioEvents.TxDone = NULL;
  RadioEvents.TxTimeout = NULL;
  RadioEvents.RxDone = NULL;

  Radio.Init( &RadioEvents );

}

//---------------------------------------------------------------------------------------------------------------------

