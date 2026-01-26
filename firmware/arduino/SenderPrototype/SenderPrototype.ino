//SenderPrototype.ino

#include "esp_sleep.h"
#include "Battery.h"
#include "ExternalClock.h"
#include "Oled.h"
#include "Types.h"


// Define the GPIO pin and level for the button

#define BUTTON_WAKEUP_PIN GPIO_NUM_47

#define BUTTON_WAKEUP_LEVEL 1 // 1 for HIGH, 0 for LOW (depending on your wiring)

//#define VEXT_PIN 21 // GPIO21 es Vext Ctrl
//#define VEXT_STATUS 1

void setup() {

  //pinMode(VEXT_CTRL_PIN, OUTPUT);
  
  Serial.begin(115200);

  Serial.println("Hola mundo!");

  //pinMode(VEXT_PIN,OUTPUT);

  //digitalWrite(VEXT_PIN, VEXT_STATUS);

  // Configuración de pines analogicos
  //analogReadResolution(12);

  pinMode(35,OUTPUT);

  delay(100);
  //initializeClock();
  delay(500);
  
  // Determine the cause of the reset
  esp_sleep_wakeup_cause_t wake_reason = esp_sleep_get_wakeup_cause();
  
  // Logic to execute on button press wake-up

  if (wake_reason == ESP_SLEEP_WAKEUP_TIMER) {
    
    
    Serial.println("I woke up by timer event");
    for(int i=0; i<4; i++){
      digitalWrite(35,HIGH);
      delay(500);
      digitalWrite(35,LOW);
      delay(500);
    }
    
    
  }else if (wake_reason == ESP_SLEEP_WAKEUP_EXT0) {
    
    //Serial.println("Woke up due to external pin (Button press). Showing display...");
    
    // 1. Gather the necessary data 
    //senderStatus senderST = getSenderStatus();
    // 2. Display the data
    //initializeOled();
    //delay(100);
    //showOled(senderST);
    


  } else if (wake_reason == ESP_SLEEP_WAKEUP_UNDEFINED) {
      
    Serial.println("Initial power-on or hard reset.");
    // No action is performed on initial boot.
    
  } else {
      
    Serial.println("Other wake-up reason.");
    
  }
  //digitalWrite(VEXT_CTRL_PIN, LOW); // Esto debería APAGAR los periféricos
}

void loop() {
  
  // THE COMPILER REQUIRES THIS FUNCTION TO BE DEFINED.
  // It only configures and enters deep sleep.
  
  const uint64_t uS_TO_S_FACTOR = 1000000;  // Conversion factor for seconds to microseconds
  const int TIME_TO_SLEEP = 20;            // Sleep for 20 seconds

  Serial.println("Entering Deep Sleep for " + String(TIME_TO_SLEEP) + " seconds or until button press...");
  
  // 1. Configure Timer Wake-up
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
  
  // 2. Configure External (Button) Wake-up
  //esp_sleep_enable_ext0_wakeup(BUTTON_WAKEUP_PIN, BUTTON_WAKEUP_LEVEL); 

  
  // FORZAR a que el Serial termine de enviar texto antes de apagar
  Serial.flush();


  // 3. Enter deep sleep
  //digitalWrite(VEXT_PIN, VEXT_STATUS);
  esp_deep_sleep_start();
  
  // Note: Execution restarts from setup() after this.
}

senderStatus getSenderStatus(){

  senderStatus senderST;
  batteryStatus senderBattery;
  // 1. Gather the necessary data 
  senderBattery = checkBatteryStatus();
  senderST.battery = senderBattery;
  senderST.date = getDateTime();

  return senderST;
}

