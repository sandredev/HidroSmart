#pragma once
#include <stdint.h>

// Política relativa del prototipo; no representa humedad volumétrica.
struct AutomaticPolicy {
  bool armed = false, locked = false, low = false, watching = false;
  unsigned cycles = 0;
  uint32_t lowSince = 0, lastCycle = 0;
  float before = 0;
  bool ready(float humidity, bool valid, bool active, uint32_t now, float minimum) {
    if (!valid) { low = false; return false; }
    if (watching && uint32_t(now - lastCycle) >= 180000UL) {
      watching = false;
      if (humidity < before + 2.0f) locked = true;
    }
    if (!armed && humidity >= minimum + 5.0f) armed = true;
    if (locked || !armed || active || cycles >= 3) { low = false; return false; }
    if (humidity >= minimum) { low = false; return false; }
    if (!low) { low = true; lowSince = now; }
    return uint32_t(now - lowSince) >= 60000UL &&
      (!cycles || uint32_t(now - lastCycle) >= 900000UL);
  }
  void started(float humidity, uint32_t now) {
    ++cycles; before = humidity; lastCycle = now; low = false; watching = true;
  }
  void suspend() { locked = true; low = false; }
};
