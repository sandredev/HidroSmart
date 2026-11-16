# Mapa de capacidades de HidroSmart

## Objetivo

Construir un prototipo de riego para una a tres plantas de pepino, operado por una persona mediante una aplicación web y un ESP8266. El control y la protección local de la bomba deben funcionar sin internet.

| Módulo | Responsabilidad | Depende de |
| --- | --- | --- |
| interfaz-web | Presentar el estado y la humedad, el historial diario, los ajustes, el control manual y el asistente en una interfaz adaptable. | api-integracion |
| api-integracion | Definir el intercambio de mediciones, estado, historial, configuración y órdenes entre la web y el dispositivo. | control-dispositivo |
| control-dispositivo | Medir humedad, controlar y proteger la bomba localmente, y sincronizar información y órdenes al recuperar la conexión. | — |
| asistente | Analizar el contexto del cultivo y, si se incorpora control, presentar propuestas que requieren aprobación. | api-integracion |

## Orden de trabajo

1. Diseñar la interfaz web con datos de demostración identificados como tales y estados sin datos, sin conexión y de error.
2. Revisar y completar el contrato de integración, especialmente órdenes manuales, confirmación del dispositivo y sincronización sin conexión.
3. Implementar y verificar la integración con la API y el ESP8266 cuando sus comportamientos estén definidos y disponibles.
4. Integrar el asistente con datos reales; los cambios propuestos requieren aprobación expresa.

El orden de diseño de la interfaz sigue la prioridad indicada para este proyecto. Las dependencias indican lo necesario para que cada capacidad funcione con datos reales, no impiden diseñarla antes.

## Suposiciones y decisiones pendientes

- Se trata de una aplicación web adaptable, sin inicio de sesión de usuario para el prototipo.
- El ESP8266 es responsable de operar la bomba y aplicar las protecciones incluso sin backend.
- El número de plantas se registra para cada ensayo y se limita a entre una y tres. El ESP8266 conserva un circuito de riego común.
- Las lecturas y el historial mostrados durante el diseño serán de demostración, no datos del cultivo real.
- El contrato propone acceso privado, órdenes manuales con confirmación, sincronización del ESP8266 y una escala relativa de humedad que se calibrará en el sustrato.
- HidroAI usará Google Gemini en pruebas. El modo que propone cambios es deseable y requiere aprobación humana.
