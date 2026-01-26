#include "Arduino.h"
#include "ExternalClock.h"

//--------------------------------DS1302--------------------------------
const int RTC_RST_PIN = 25;
const int RTC_CLK_PIN = 32;
const int RTC_DATA_PIN = 14;

// Pin: RST, DAT, CLK
ThreeWire myWire(RTC_DATA_PIN, RTC_CLK_PIN, RTC_RST_PIN); // IO, SCLK, CE
RtcDS1302<ThreeWire> Rtc(myWire);

//------------------------------------------------------------------------


void initializeClock(){
  //---------------------------------CLOCK----------------------------------
  Serial.print("compiled: ");
  Serial.print(__DATE__);
  Serial.println(__TIME__);

  Rtc.Begin();
  RtcDateTime compiled = RtcDateTime(__DATE__, __TIME__);
  Serial.println();

  if (!Rtc.IsDateTimeValid()) 
    {
        // Common Causes:
        //    1) first time you ran and the device wasn't running yet
        //    2) the battery on the device is low or even missing

        Serial.println("RTC lost confidence in the DateTime!");
        Rtc.SetDateTime(compiled);
    }

  if (Rtc.GetIsWriteProtected())
  {
      Serial.println("RTC was write protected, enabling writing now");
      Rtc.SetIsWriteProtected(false);
  }

  if (!Rtc.GetIsRunning())
  {
      Serial.println("RTC was not actively running, starting now");
      Rtc.SetIsRunning(true);
  }

  RtcDateTime now = Rtc.GetDateTime();
  if (now < compiled) 
  {
      Serial.println("RTC is older than compile time!  (Updating DateTime)");
      Rtc.SetDateTime(compiled);
  }
  else if (now > compiled) 
  {
      Serial.println("RTC is newer than compile time. (this is expected)");
  }
  else if (now == compiled) 
  {
      Serial.println("RTC is the same as compile time! (not expected but all is fine)");
  }

  
  //-------------------------------------------------------------------------
}



String getDateTime() 
{
  RtcDateTime dt = Rtc.GetDateTime();

  char datestring[26];

  snprintf_P(datestring, 
          sizeof(datestring),
          PSTR("- %02u:%02u %02u/%02u/%04u -"),
          dt.Hour(),
          dt.Minute(),
          dt.Day(),
          dt.Month(),
          dt.Year()
          );

  String result = !dt.IsValid() ? "Date is not valid" : String(datestring);
  
  return result; 
}