#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include "config.local.h"

// Diagnóstico exclusivamente de red: no configura salidas, no lee A0,
// no publica mediciones/estado, no consume ni confirma órdenes.
static uint32_t lastAttempt = 0;
static bool firstAttempt = true;
static bool wasConnected = false;
static uint32_t lastCheck = 0;
static bool firstCheck = true;
static WiFiEventHandler connectedHandler, disconnectedHandler, ipHandler;
static uint32_t lastStatus = 0;


bool query(const char* route, DynamicJsonDocument& document, bool device = false) {
  if (!strlen(HIDROSMART_WIFI_PASSWORD) && String(HIDROSMART_API_BASE_URL).startsWith("http://")) {
    Serial.println(F("[API] Red abierta: no se envían claves por HTTP. Se requiere transporte seguro."));
    return false;
  }
  WiFiClient client;
  HTTPClient http;
  http.setTimeout(8000);
  http.useHTTP10(true); // Flujo JSON sin codificación chunked.
  if (!http.begin(client, String(HIDROSMART_API_BASE_URL) + "/" + route)) return false;
  http.addHeader("apikey", HIDROSMART_API_KEY);
  if (device) http.addHeader("x-device-token", HIDROSMART_DEVICE_TOKEN);
  int code = http.GET();
  Serial.printf("[API] %s: HTTP %d\n", route, code);
  bool valid = false;
  if (code == 200 && http.getSize() <= 4096) {
    auto error = deserializeJson(document, http.getStream());
    valid = !error && document["ok"] == true && document["data"].is<JsonObject>();
    if (!valid) Serial.println(F("[API] Respuesta no válida."));
  }
  http.end();
  return valid;
}

void checkApi() {
  DynamicJsonDocument config(2048);
  if (query("obtener-configuracion", config)) {
    JsonObject data = config["data"];
    JsonVariant minimum = data["umbrales_humedad"]["minimo"];
    JsonVariant maximum = data["umbrales_humedad"]["maximo"];
    JsonVariant seconds = data["tiempo_maximo_riego_segundos"];
    if (minimum.is<double>() && maximum.is<double>() && seconds.is<int>() &&
        minimum.as<double>() >= 0 && maximum.as<double>() <= 100 &&
        minimum.as<double>() < maximum.as<double>() && seconds.as<int>() >= 1 && seconds.as<int>() <= 300) {
      Serial.printf("[API] Configuración válida: %.1f–%.1f %%, máximo %d s.\n",
                    minimum.as<double>(), maximum.as<double>(), seconds.as<int>());
    } else Serial.println(F("[API] Configuración fuera de contrato."));
  }
  DynamicJsonDocument commands(2048);
  if (query("obtener-comando-pendiente", commands, true)) {
    Serial.println(commands["data"]["comando"].isNull()
      ? F("[API] Autenticación de dispositivo correcta; sin órdenes pendientes.")
      : F("[API] Hay una orden; diagnóstico NO la ejecuta ni confirma."));
  }
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(false);
  Serial.println(F("\nHidroSmart: diagnóstico de red. Relé y ADC deshabilitados."));
  Serial.println(F("Mantener IN y AO desconectados y bomba sin alimentación."));
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setPhyMode(WIFI_PHY_MODE_11G); // Ensayo de compatibilidad con AP institucional.
  connectedHandler = WiFi.onStationModeConnected([](const WiFiEventStationModeConnected& event) {
    Serial.printf("[Wi-Fi] Asociado al AP, canal %u; esperando DHCP.\n", event.channel);
  });
  disconnectedHandler = WiFi.onStationModeDisconnected([](const WiFiEventStationModeDisconnected& event) {
    Serial.printf("[Wi-Fi] Desconexión: motivo SDK %u.\n", unsigned(event.reason));
  });
  ipHandler = WiFi.onStationModeGotIP([](const WiFiEventStationModeGotIP&) {
    Serial.print(F("[DHCP] IP recibida: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("[DHCP] Puerta de enlace: "));
    Serial.println(WiFi.gatewayIP());
  });
  WiFi.setAutoReconnect(true);
  WiFi.setSleepMode(WIFI_NONE_SLEEP); // USB: priorizar latencia de diagnóstico.
  if (!strlen(HIDROSMART_WIFI_SSID)) {
    Serial.println(F("[CONFIG] Completar Wi-Fi en config.local.h y recompilar."));
  }
}

void loop() {
  const uint32_t now = millis();
  if (!strlen(HIDROSMART_WIFI_SSID)) {
    delay(50);
    return;
  }
  if (uint32_t(now - lastStatus) >= 10000) {
    lastStatus = now;
    Serial.printf("[Wi-Fi] Estado %d; RSSI %d dBm; tiempo %lu s.\n", int(WiFi.status()), WiFi.RSSI(), static_cast<unsigned long>(now / 1000));
  }
  const bool connected = WiFi.status() == WL_CONNECTED;
  if (connected != wasConnected) {
    wasConnected = connected;
    if (connected) {
      Serial.print(F("[Wi-Fi] Conectado. IP: "));
      Serial.println(WiFi.localIP());
      firstCheck = true;
    } else Serial.println(F("[Wi-Fi] Conexión perdida; reintentando."));
  }
  if (!connected && (firstAttempt || uint32_t(now - lastAttempt) >= 30000)) {
    firstAttempt = false;
    lastAttempt = now;
    Serial.println(F("[Wi-Fi] Buscando el SSID configurado en 2,4 GHz."));
    int count = WiFi.scanNetworks();
    int matches = 0;
    for (int i = 0; i < count; ++i) {
      if (WiFi.SSID(i) == HIDROSMART_WIFI_SSID) {
        ++matches;
        Serial.printf("[SCAN] Coincidencia: canal %d, RSSI %d dBm, cifrado %u.\n", WiFi.channel(i), WiFi.RSSI(i), unsigned(WiFi.encryptionType(i)));
      }
    }
    Serial.printf("[SCAN] Resultado %d, coincidencias %d.\n", count, matches);
    WiFi.scanDelete();
    Serial.println(F("[Wi-Fi] Intentando conexión de 2,4 GHz."));
    if (strlen(HIDROSMART_WIFI_PASSWORD)) {
      WiFi.begin(HIDROSMART_WIFI_SSID, HIDROSMART_WIFI_PASSWORD);
    } else {
      WiFi.begin(HIDROSMART_WIFI_SSID); // Red abierta: contraseña vacía válida.
    }
  }
  if (connected && (firstCheck || uint32_t(now - lastCheck) >= 15000)) {
    firstCheck = false;
    lastCheck = now;
    checkApi();
  }
  delay(10);
}
