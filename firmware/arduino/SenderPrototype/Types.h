// Types.h
#ifndef TYPES_H          // 1. Si TYPES_H NO está definido...
#define TYPES_H          // 2. Define TYPES_H

struct batteryStatus {
  float realVoltage;
  int batteryPercentage;
};

struct senderStatus {
  batteryStatus battery;
  bool loraStatus;
  int humidity;
  String location;
};

#endif // TYPES_H         // 3. Termina el bloque condicional