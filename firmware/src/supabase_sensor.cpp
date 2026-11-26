#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "config.local.h"
#include "supabase.local.h"
#include "supabase_ca.h"
#include "calibration.h"
#undef HIDROSMART_SENSOR_DRY_RAW
#undef HIDROSMART_SENSOR_WET_RAW
#define HIDROSMART_SENSOR_DRY_RAW soilDryRaw
#define HIDROSMART_SENSOR_WET_RAW soilWetRaw

// control_cloud añade control; supabase_sensor conserva adquisición sin relé.
static uint32_t lastSample = 0, lastSend = 0, lastWifi = 0;
static bool firstWifi = true;
static uint32_t sum = 0;
static uint8_t samples = 0;
static float raw = 0;
static bool haveReading = false;
static uint32_t readingSequence = 0;
static BearSSL::X509List roots(supabaseRootCa);
static_assert(HIDROSMART_MEASUREMENT_INTERVAL_MS >= 10000UL, "Intervalo minimo 10 segundos");

int request(const String& path, const String* body, DynamicJsonDocument& response, const char* method = "POST") {
  if (!String(CLOUD_BASE_URL).startsWith("https://")) return -100;
  BearSSL::WiFiClientSecure client;
  client.setTrustAnchors(&roots);
  HTTPClient http;
  http.setTimeout(8000);
  http.useHTTP10(true);
  if (!http.begin(client, String(CLOUD_BASE_URL) + path)) return -101;
  http.addHeader("apikey", CLOUD_PUBLISHABLE_KEY);
  http.addHeader("x-device-token", CLOUD_DEVICE_TOKEN);
  int code;
  if (body) {
    http.addHeader("x-device-token", CLOUD_DEVICE_TOKEN);
    http.addHeader("Content-Type", "application/json");
    code = http.sendRequest(method, *body);
  } else code = http.GET();
  if (code > 0 && http.getSize() <= 4096) {
    if (deserializeJson(response, http.getStream())) {
      Serial.println(F("[API] Respuesta no interpretable; no asumir registro exitoso."));
    }
  }
  if (code < 0) Serial.printf("[TLS/RED] HTTP %d; TLS %d.\n", code, client.getLastSSLError());
  http.end();
  return code;
}

bool calibrated() {
  return HIDROSMART_SENSOR_DRY_RAW >= 0 && HIDROSMART_SENSOR_DRY_RAW <= 1023 &&
         HIDROSMART_SENSOR_WET_RAW >= 0 && HIDROSMART_SENSOR_WET_RAW <= 1023 &&
         abs(HIDROSMART_SENSOR_WET_RAW - HIDROSMART_SENSOR_DRY_RAW) >= 5;
}

float relativeHumidity(float value, float dry, float wet) {
  if (fabsf(wet - dry) < 5.0f) return 100.0f * (1023.0f - value) / 1023.0f;
  return 100.0f * (value - dry) / (wet - dry);
}

void sendReading() {
  if (!strlen(CLOUD_PUBLISHABLE_KEY) || !strlen(CLOUD_DEVICE_TOKEN) || !strlen(CLOUD_DEVICE_ID)) {
    Serial.println(F("[CONFIG] Faltan credenciales Supabase en supabase.local.h; no se envia."));
    return;
  }
  time_t now = time(nullptr);
  if (now < 1700000000) {
    Serial.println(F("[HORA] Esperando sincronizacion NTP; no se inventa fecha ni se omite validacion TLS."));
    return;
  }
  // Solo este identificador de dispositivo; no admite insertar parametros en la URL.
  for (const char* c = CLOUD_DEVICE_ID; *c; ++c) {
    if (!isalnum(static_cast<unsigned char>(*c)) && *c != '-' && *c != '_') {
      Serial.println(F("[CONFIG] Identificador no compatible con la URL."));return;
    }
  }
  DynamicJsonDocument state(2048);
  int status = request(String("/obtener-estado?dispositivo_id=") + CLOUD_DEVICE_ID, nullptr, state);
  if (status != 200 || state["ok"] != true) {
    Serial.printf("[API] Verificacion de dispositivo HTTP %d; envio bloqueado.\n", status);
    return;
  }
  const bool valid = calibrated() && raw > 1 && raw < 1022;
  // Sin calibracion: indice electrico relativo, nunca humedad valida del suelo.
  float humidity = relativeHumidity(raw, HIDROSMART_SENSOR_DRY_RAW, HIDROSMART_SENSOR_WET_RAW);
  humidity = constrain(humidity, 0.0f, 100.0f);
  char timestamp[25];
  struct tm utc;
  gmtime_r(&now, &utc);
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &utc);
  StaticJsonDocument<512> reading;
  reading["dispositivo_id"] = CLOUD_DEVICE_ID;
  reading["humedad"] = humidity;
  reading["valor_original"] = raw;
  reading["tipo_lectura"] = calibrated() ? "calibrada" : "relativa";
  reading["valida"] = valid;
  reading["fecha_medicion"] = timestamp;
  String body;
  serializeJson(reading, body);
  DynamicJsonDocument response(2048);
  status = request("/registrar-medicion", &body, response);
  if (status == 201 && response["ok"] == true) {
    Serial.printf("[API] Medicion registrada: raw %.1f; %s.\n", raw,
                  valid ? "calibrada" : "NO VALIDA COMO HUMEDAD, pendiente calibracion");
  } else {
    Serial.printf("[API] Registro no confirmado, HTTP %d. No se reintenta la misma medicion.\n", status);
  }
}

#ifdef HIDROSMART_CONTROLLER
#include "cloud_control.h"
#endif

void setup() {
#ifdef HIDROSMART_CONTROLLER
  controllerBegin();
#endif
  Serial.begin(115200);
  Serial.setDebugOutput(false);
  Serial.println(F("\nHidroSmart: sensor A0 + Supabase HTTPS."));
#ifdef HIDROSMART_CONTROLLER
  Serial.printf("[AUTO] enabled=%d armed=%d locked=%d cycles=%u storage=%d. Espera suelo humedo antes de armar.\n", automaticEnabled, automatic.armed, automatic.locked, automatic.cycles, storageReady);
#endif
  if (calibrated()) {
    Serial.printf("Calibracion activa: seco %d; humedo %d.\n",
                  HIDROSMART_SENSOR_DRY_RAW, HIDROSMART_SENSOR_WET_RAW);
  } else {
    Serial.println(F("Sin calibracion: indice electrico provisional con valida=false."));
  }
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.setSleepMode(WIFI_NONE_SLEEP);
  configTime(0, 0, "pool.ntp.org", "time.google.com");
}

void loop() {
#ifdef HIDROSMART_CONTROLLER
  controllerSafety();
#endif
  const uint32_t now = millis();
  if (uint32_t(now - lastSample) >= 50) {
    lastSample = now;
    sum += analogRead(A0);
    if (++samples == 16) {
      raw = sum / 16.0f;
      haveReading = true;
      ++readingSequence;
      Serial.printf("[A0] %.1f/1023; Wi-Fi %d.\n", raw, int(WiFi.status()));
      samples = 0;sum = 0;
    }
  }
  if (strlen(HIDROSMART_WIFI_SSID) && WiFi.status() != WL_CONNECTED &&
      (firstWifi || uint32_t(now - lastWifi) >= 60000)) {
    firstWifi = false;lastWifi = now;
    Serial.println(F("[Wi-Fi] Intentando conectar."));
    if (strlen(HIDROSMART_WIFI_PASSWORD)) WiFi.begin(HIDROSMART_WIFI_SSID, HIDROSMART_WIFI_PASSWORD);
    else WiFi.begin(HIDROSMART_WIFI_SSID);
  }
  if (haveReading && WiFi.status() == WL_CONNECTED && uint32_t(now - lastSend) >= HIDROSMART_MEASUREMENT_INTERVAL_MS) {
    lastSend = now;
    sendReading();
  }
#ifdef HIDROSMART_CONTROLLER
  controllerLoop();
#endif
  delay(1);
}
