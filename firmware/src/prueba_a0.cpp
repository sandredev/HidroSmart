#include <Arduino.h>
#include <ESP8266WiFi.h>

// Ensayo de entrada: solo divisor 56k/10k desde 3V3; sin sensor/relé.
// No incluye claves, no publica datos ni configura GPIO de salida.
static uint32_t lastSample = 0;
static uint32_t nextWindow = 0;
static uint32_t total = 0;
static uint16_t lowest = 1023, highest = 0;
static uint8_t count = 0;

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(false);
  WiFi.persistent(false);
  WiFi.mode(WIFI_OFF);
  Serial.println(F("\nHidroSmart: prueba A0, escala bruta 0-1023."));
  Serial.println(F("Solo divisor 56k/10k desde 3V3. Sensor y rele desconectados."));
  Serial.println(F("No es una medida de humedad ni una verificacion de tension."));
}

void loop() {
  uint32_t now = millis();
  if (int32_t(now - nextWindow) >= 0 && uint32_t(now - lastSample) >= 20) {
    lastSample = now;
    uint16_t raw = analogRead(A0);
    total += raw;
    if (raw < lowest) lowest = raw;
    if (raw > highest) highest = raw;
    if (++count == 16) {
      Serial.printf("[A0] promedio=%.1f minimo=%u maximo=%u (16 muestras)\n",
                    total / 16.0, unsigned(lowest), unsigned(highest));
      total = 0;
      count = 0;
      lowest = 1023;
      highest = 0;
      nextWindow = now + 1000;
    }
  }
  delay(1);
}
