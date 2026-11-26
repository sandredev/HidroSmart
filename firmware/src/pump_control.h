#pragma once
#include <Arduino.h>
#include <Ticker.h>

// Exclusivamente para D1 -> resistencia -> NPN -> IN activo bajo.
// HIGH en GPIO5 activa el transistor. No conectar GPIO directamente a IN.
class PumpControl {
 public:
  void begin(bool verified) {
    enabled = verified;
    if (enabled) { digitalWrite(5, LOW); pinMode(5, OUTPUT); }
  }
  bool start(uint32_t seconds, bool sensorValid) {
    if (!enabled || active || !sensorValid || seconds < 1 || seconds > 30) return false;
    active = true;
    deadline = millis() + seconds * 1000UL;
    // Corte independiente de las esperas HTTP del bucle principal.
    cutoff.once_ms(seconds * 1000UL, [this]() { stop(); });
    digitalWrite(5, HIGH);
    return true;
  }
  void stop() {
    if (enabled) digitalWrite(5, LOW);
    active = false;
  }
  void check(bool sensorValid) {
    if (active && (!sensorValid || int32_t(millis() - deadline) >= 0)) stop();
  }
  bool running() const { return active; }
 private:
  Ticker cutoff;
  bool enabled = false;
  volatile bool active = false;
  uint32_t deadline = 0;
};
