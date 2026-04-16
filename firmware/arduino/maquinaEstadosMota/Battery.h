// Battery.h

struct batteryStatus {
  float realVoltage;
  int batteryPercentage;
};

batteryStatus checkBatteryStatus();