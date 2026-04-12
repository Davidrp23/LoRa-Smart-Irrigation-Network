#define MOSFET_PIN 17

void setup() {
  pinMode(MOSFET_PIN, OUTPUT);
}

void loop() {
  digitalWrite(MOSFET_PIN, HIGH);  // Enciende el LED (y tus futuros sensores)
  delay(2000);                     // Espera 2 segundos
  digitalWrite(MOSFET_PIN, LOW);   // Apaga todo, cortando el GND
  delay(2000);
}