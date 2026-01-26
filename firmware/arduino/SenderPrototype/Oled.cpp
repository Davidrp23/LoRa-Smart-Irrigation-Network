#include "esp32-hal-adc.h"
#include "Arduino.h"
#include "Oled.h"

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RST);

int chargeAnimationStep = 0; // Paso actual de la animación de carga (0, 1, 2...)

// --- 1. ICONO DE BATERÍA (CONSTANTES) ---
  const int X_START = 0;
  const int Y_START = 15;
  const int ICON_WIDTH = 12;
  const int ICON_HEIGHT = 8;



void initializeOled(){
  //--------------------------------OLED--------------------------------
  pinMode(OLED_RST, OUTPUT);
  digitalWrite(OLED_RST, LOW);
  delay(20);
  digitalWrite(OLED_RST, HIGH);

  Wire.begin(OLED_SDA, OLED_SCL);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C, false, false)) { 
    for(;;); 
  }
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0,0);
  display.print("Starting...");
  display.display();
  //------------------------------------------------------------------------
}

// Dibuja el icono de la batería (solo la silueta)
void drawBatteryIcon(int x, int y, int w, int h) {
  display.drawRect(x, y, w, h, WHITE); // Cuerpo
  display.drawFastVLine(x + w, y + h/4, h/2, WHITE); // Terminal (+)
}


// Función principal para controlar la pantalla
void showOled(senderStatus sender) {

  int times=0;

  while(times<=15){

    display.clearDisplay();
    
    drawBatteryIcon(X_START, Y_START, ICON_WIDTH, ICON_HEIGHT);

    // --- 2. LÓGICA DE VISUALIZACIÓN ---
    String bateryText;
    int fillWidth;
    
    if (sender.battery.isCharged && sender.battery.isCharging){
      // --- CARGA COMPLETA ---
      bateryText = "Full"; // Texto más conciso
      fillWidth = ICON_WIDTH - 2; // Relleno completo
      chargeAnimationStep = 0; // Resetea la animación
      
    } else if (sender.battery.isCharging) {
      // --- CARGANDO: ANIMACIÓN ---
      bateryText = "Charging";

      // Lógica de la animación de carga: El relleno se mueve en ciclos
      int stepWidth = (ICON_WIDTH - 2) / MAX_CHARGE_ANIM_STEPS;
      
      // La barra se va llenando en cada paso
      fillWidth = stepWidth * chargeAnimationStep; 

      // Actualiza el paso de la animación para el siguiente ciclo
      chargeAnimationStep = (chargeAnimationStep + 1) % (MAX_CHARGE_ANIM_STEPS + 1);
      
      // Opcional: también puedes hacer una animación que parpadee
      // fillWidth = (chargeAnimationStep % 2 == 0) ? (ICON_WIDTH - 2) : 0;
      
    } else {
      // --- DESCARGANDO (Normal) ---
      bateryText = "Discharging";
      
      // Relleno proporcional al porcentaje
      fillWidth = map(sender.battery.batteryPercentage, 0, 100, 0, ICON_WIDTH - 2); 
      
      // --- MUESTRA PORCENTAJE ---
      display.setTextSize(1);
      display.setCursor(X_START + ICON_WIDTH + 5, Y_START); 
      display.print(sender.battery.batteryPercentage);
      display.print("%");
      chargeAnimationStep = 0; // Resetea la animación
    }
    
    // --- 3. DIBUJA EL RELLENO DE LA BATERÍA ---
    // Solo dibuja si no está en carga completa o si no es el paso 0 de la animación (para parpadeo)
    if (fillWidth > 0) { 
        display.fillRect(X_START + 1, Y_START + 1, fillWidth, ICON_HEIGHT - 2, WHITE);
    }

    // --- 4. MUESTRA EL ESTADO (Charging, Full, Discharging) ---
    display.setTextSize(1);
    display.setCursor(X_START + ICON_WIDTH + 35, Y_START); // Ajusto la posición para que no se superponga
    display.print(bateryText);

    // --- 5. FECHA ---
    display.setTextSize(1);
    display.setCursor(0, 0); 
    display.print(sender.date);

    // --- 6. Algunos datos de la bateria solo para debug
    
    display.setTextSize(1);
    display.setCursor(0, 30); 
    display.print(sender.battery.adcValue);

    display.setTextSize(1);
    display.setCursor(0, 40); 
    display.print(sender.battery.realVoltage);
    


    display.display();

    delay(500);

    times++;
  }
  display.clearDisplay();
  //display.ssd1306_command(SSD1306_DISPLAYOFF); //Para ponerla en bajo consumo
  
}