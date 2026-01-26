//ExternalClock.h

#include <RtcDS1302.h> //External clock

//Clock print function
#define countof(a) (sizeof(a) / sizeof(a[0]))

void initializeClock();
String getDateTime();