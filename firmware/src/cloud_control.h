#pragma once
#include <LittleFS.h>
#include "pump_control.h"

PumpControl cloudPump;
bool storageReady = false;
uint32_t commandPoll = 0, configPoll = 0, reportPoll = 0, runStarted = 0;
uint32_t limitSeconds = 5;
String processedId, ackId, ackState, eventId;
bool needsClose = false;
bool localCycle = false;
int lastControlHttp = 0;
unsigned elapsedSeconds = 1;

float soilPercent() { return constrain(relativeHumidity(raw, soilDryRaw, soilWetRaw), 0.0f, 100.0f); }
bool sensorOkay() { return haveReading && raw > 1 && raw < 1022; }

bool persistControl() {
  StaticJsonDocument<768> doc;
  doc["processed"] = processedId; doc["ackId"] = ackId; doc["ackState"] = ackState;
  doc["eventId"] = eventId; doc["seconds"] = limitSeconds;
  File file = LittleFS.open("/control.tmp", "w");
  if (!file) return false;
  size_t written = serializeJson(doc, file);
  file.close();
  return written && LittleFS.rename("/control.tmp", "/control.json");
}

void controllerBegin() {
  cloudPump.begin(true); // D1/GPIO5 HIGH -> NPN -> IN bajo. Pull-down externo requerido.
  storageReady = LittleFS.begin(); // Nunca formatear automáticamente el historial/configuración.
  if (!storageReady) return;
  File file = LittleFS.open("/control.json", "r");
  if (file) {
    StaticJsonDocument<768> doc;
    if (!deserializeJson(doc, file)) {
      processedId = doc["processed"].as<String>(); ackId = doc["ackId"].as<String>();
      ackState = doc["ackState"].as<String>(); eventId = doc["eventId"].as<String>();
      limitSeconds = constrain(doc["seconds"] | 5U, 1U, 30U);
    }
    file.close();
  }
  // Tras reinicio jamás reanudar un riego ni inventar duración del ciclo interrumpido.
  if (eventId.length()) Serial.println("[CONTROL] Evento interrumpido: requiere revision; inicio bloqueado.");
}

void controllerSafety() {
  cloudPump.check(sensorOkay());
  if (cloudPump.running() && !localCycle && WiFi.status() != WL_CONNECTED) cloudPump.stop();
  static bool wasActive = false;
  if (wasActive && !cloudPump.running()) {
    elapsedSeconds = constrain(unsigned((millis() - runStarted + 500) / 1000), 1U, unsigned(limitSeconds));
    needsClose = eventId.length();
    localCycle = false;
    Serial.println("[CONTROL] Salida apagada; cierre de evento pendiente.");
  }
  wasActive = cloudPump.running();
}

bool cloudJson(const char* route, JsonDocument& payload, DynamicJsonDocument& reply, const char* method = "POST") {
  payload["dispositivo_id"] = CLOUD_DEVICE_ID;
  String body; serializeJson(payload, body);
  int code = request(String("/") + route, &body, reply, method);
  lastControlHttp = code;
  return code >= 200 && code < 300 && reply["ok"] == true;
}

void controllerLoop() {
  // Parada física local disponible aun sin Internet, sin aprobación automática de inicios.
  static String serialLine;
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      serialLine.trim();
      if (serialLine == "detener") { cloudPump.stop(); Serial.println("[CONTROL] Parada local."); }
      if (serialLine == "iniciar" && !eventId.length() && sensorOkay()) {
        // Aprobación presencial por USB: ciclo fijo de 5 s, aun sin Internet.
        localCycle = true;
        if (cloudPump.start(5, true)) { runStarted = millis(); Serial.println("[CONTROL] Pulso local aprobado: 5 s; historial remoto no disponible para este pulso."); }
        else localCycle = false;
      }
      serialLine = "";
    } else if (serialLine.length() < 32) serialLine += c;
    else { serialLine = ""; cloudPump.stop(); }
  }
  controllerSafety();
  if (WiFi.status() != WL_CONNECTED || time(nullptr) < 1700000000 || !storageReady) return;
  const uint32_t now = millis();
  if (needsClose) {
    StaticJsonDocument<512> data; DynamicJsonDocument reply(2048);
    data["operacion"] = "finalizar"; data["evento_id"] = eventId;
    data["humedad_fin"] = soilPercent(); data["duracion_segundos"] = elapsedSeconds;
    if (cloudJson("registrar-evento-riego", data, reply)) {
      eventId = ""; needsClose = false; persistControl();
    }
    return;
  }
  if (ackId.length()) {
    StaticJsonDocument<384> data; DynamicJsonDocument reply(2048);
    data["comando_id"] = ackId; data["estado"] = ackState;
    if (cloudJson("actualizar-estado-comando", data, reply, "PATCH")) {
      ackId = ""; ackState = ""; persistControl();
    } else if (lastControlHttp == 409) {
      cloudPump.stop();
      Serial.println("[CONTROL] Confirmacion vencida/conflictiva: salida apagada, comando no se repite.");
      ackId = ""; ackState = ""; persistControl();
    }
    return;
  }
  if (uint32_t(now - reportPoll) >= 5000) {
    reportPoll = now;
    StaticJsonDocument<256> data; DynamicJsonDocument reply(2048);
    data["bomba_activa"] = cloudPump.running();
    if (!cloudJson("actualizar-estado-dispositivo", data, reply, "PATCH")) cloudPump.stop();
    controllerSafety();
    return;
  }
  if (!cloudPump.running() && uint32_t(now - configPoll) >= 60000) {
    configPoll = now; DynamicJsonDocument reply(2048);
    int code = request(String("/obtener-configuracion?dispositivo_id=") + CLOUD_DEVICE_ID, nullptr, reply);
    if (code == 200 && reply["ok"] == true) {
      unsigned seconds = reply["data"]["configuracion"]["tiempo_maximo_riego_segundos"] | 5U;
      limitSeconds = constrain(seconds, 1U, 30U); persistControl();
    }
    return;
  }
  if (uint32_t(now - commandPoll) < 2000) return;
  commandPoll = now;
  DynamicJsonDocument reply(2048);
  int code = request(String("/obtener-comando-pendiente?dispositivo_id=") + CLOUD_DEVICE_ID, nullptr, reply);
  controllerSafety();
  if (code != 200 || reply["ok"] != true || !reply["comando"].is<JsonObject>()) return;
  String id = reply["comando"]["id"] | "";
  String action = reply["comando"]["accion"] | "";
  String expiration = reply["comando"]["expira_en"] | "";
  struct tm tm = {};
  bool unexpired = strptime(expiration.c_str(), "%Y-%m-%dT%H:%M:%S", &tm) && mktime(&tm) > time(nullptr) + 5;
  if (!id.length() || id.length() > 64 || id == processedId) return;
  processedId = id; ackId = id; ackState = "rechazada";
  if (!persistControl()) { storageReady = false; cloudPump.stop(); return; }
  if (action == "detener_riego") { cloudPump.stop(); ackState = "ejecutada"; }
  else if (action == "iniciar_riego" && unexpired && sensorOkay() && !cloudPump.running() && !eventId.length()) {
    StaticJsonDocument<384> data; DynamicJsonDocument result(2048);
    data["operacion"] = "iniciar"; data["motivo"] = "manual"; data["humedad_inicio"] = soilPercent();
    if (cloudJson("registrar-evento-riego", data, result)) {
      eventId = result["data"]["id"].as<String>();
      raw = analogRead(A0); // Revalidar sensor después de la espera HTTP.
      if (eventId.length() && persistControl() && mktime(&tm) > time(nullptr) + 3 && cloudPump.start(limitSeconds, sensorOkay())) {
        runStarted = millis(); ackState = "ejecutada";
        Serial.println("[CONTROL] Riego manual aprobado iniciado.");
      } else if (eventId.length()) {
        needsClose = true; elapsedSeconds = 1;
      }
    }
  }
  persistControl(); controllerSafety();
}
