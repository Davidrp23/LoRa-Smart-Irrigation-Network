#include "Arduino.h"
#include "Oled.h"

static SSD1306Wire  display(0x3c, 500000, SDA_OLED, SCL_OLED, GEOMETRY_128_64, RST_OLED); // addr , freq , i2c group , resolution , rst

int chargeAnimationStep = 0; // Paso actual de la animación de carga (0, 1, 2...)

// --- 1. ICONO DE BATERÍA (CONSTANTES) ---
  const int X_START = 0;
  const int Y_START = 0;
  const int ICON_WIDTH = 12;
  const int ICON_HEIGHT = 8;



void initializeOled(){
  display.init();
  display.setFont(ArialMT_Plain_10);
  display.clear();
  display.drawString(0, 0, String("Starting..."));
  display.display();
  delay(1000);
  display.clear();

}

// Dibuja el icono de la batería (solo la silueta)
void drawBatteryIcon(int x, int y, int w, int h) {

  display.drawRect(x, y, w, h); 
  // Una línea vertical va desde (x, y1) hasta (x, y2)
  display.drawLine(x + w, y + h/4, x + w, y + h/4 + h/2); 
}

// Función principal para controlar la pantalla
void showOled(senderStatus sender) {
  display.clear();
  drawBatteryIcon(X_START, Y_START, ICON_WIDTH, ICON_HEIGHT);

  int fillWidth = map(sender.battery.batteryPercentage, 0, 100, 0, ICON_WIDTH - 2); 
  
  display.drawString(X_START + ICON_WIDTH + 5, Y_START, String(sender.battery.batteryPercentage) + "%");
  
  // Eliminamos el parámetro "WHITE" aquí también
  if (fillWidth > 0) {
    display.fillRect(X_START + 1, Y_START + 1, fillWidth, ICON_HEIGHT - 2);
  }

  display.drawString(40, 0, "  ---  " + String(sender.battery.realVoltage)+" V");
  display.display();
}
//display.ssd1306_command(SSD1306_DISPLAYOFF); //Para ponerla en bajo consumo