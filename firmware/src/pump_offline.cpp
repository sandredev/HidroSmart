#include <Arduino.h>
#include <ESP8266WiFi.h>
#include "calibration.h"
#include "pump_control.h"

// Cambiar a 1 solo tras validar NPN, resistencia de base y pull-down.
#ifndef HIDROSMART_PUMP_VERIFIED
#define HIDROSMART_PUMP_VERIFIED 0
#endif
PumpControl pump;
uint32_t sampledAt = 0;
uint16_t reading = 0;
bool valid = false;
char command[32];
size_t used = 0;

void setup() {
  pump.begin(HIDROSMART_PUMP_VERIFIED == 1);
  Serial.begin(115200);
  WiFi.persistent(false);
  WiFi.mode(WIFI_OFF);
  Serial.printf("Modo local. Seco=%d humedo=%d. Salida habilitada=%d\n", soilDryRaw, soilWetRaw, HIDROSMART_PUMP_VERIFIED);
  Serial.println("Ordenes: iniciar (5 segundos), detener, estado. Sin riego automatico.");
}

void loop() {
  if (millis() - sampledAt >= 1000) {
    sampledAt = millis();
    reading = analogRead(A0);
    valid = reading > 1 && reading < 1022;
    pump.check(valid);
    float humidity = constrain(100.0f * (soilDryRaw - reading) / (soilDryRaw - soilWetRaw), 0.0f, 100.0f);
    Serial.printf("A0=%u humedad relativa=%.1f valida=%d bomba=%d\n", reading, humidity, valid, pump.running());
  }
  pump.check(valid);
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      command[used] = 0;
      if (!strcmp(command, "detener")) { pump.stop(); Serial.println("Bomba apagada."); }
      else if (!strcmp(command, "iniciar")) Serial.println(pump.start(5, valid) ? "Riego aprobado: 5 s." : "Inicio rechazado: montaje no habilitado, sensor invalido o riego activo.");
      else if (!strcmp(command, "estado")) Serial.printf("Bomba=%d sensor=%d\n", pump.running(), valid);
      else Serial.println("Orden desconocida.");
      used = 0;
    } else if (used < sizeof(command) - 1) command[used++] = c;
    else { used = 0; pump.stop(); }
  }
  delay(1);
}
