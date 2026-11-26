#pragma once

// Plantilla sin secretos. Copiar a config.local.h, excluido de Git.
// El firmware de diagnóstico usa solo Wi-Fi/API y NO habilita la bomba.
#define HIDROSMART_WIFI_SSID ""
#define HIDROSMART_WIFI_PASSWORD ""
#define HIDROSMART_API_BASE_URL "http://192.168.1.13:8787/functions/v1"
#define HIDROSMART_API_KEY ""
#define HIDROSMART_DEVICE_TOKEN ""
#define HIDROSMART_DEVICE_ID "esp8266-cultivo-01"

// Frecuencias locales propuestas; no son campos nuevos de la API.
#define HIDROSMART_MEASUREMENT_INTERVAL_MS 30000UL
#define HIDROSMART_COMMAND_INTERVAL_MS 2000UL
#define HIDROSMART_STATE_INTERVAL_MS 15000UL
#define HIDROSMART_CONFIG_INTERVAL_MS 60000UL

// Bloqueos hasta verificar conexiones y calibrar con el montaje definitivo.
#define HIDROSMART_HARDWARE_VERIFIED false
#define HIDROSMART_RELAY_GPIO -1
#define HIDROSMART_RELAY_ON_LEVEL -1
#define HIDROSMART_SENSOR_DRY_RAW -1
#define HIDROSMART_SENSOR_WET_RAW -1
