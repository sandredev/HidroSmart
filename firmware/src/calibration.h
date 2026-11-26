#pragma once
// Puntos medidos en el sustrato. Independientes de las credenciales Wi-Fi.
constexpr int soilDryRaw = 144;
constexpr int soilWetRaw = 91;
static_assert(soilDryRaw > soilWetRaw + 5, "Calibracion inconsistente");
