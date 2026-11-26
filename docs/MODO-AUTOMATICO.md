# Automatización autorizada del prototipo

El operador autorizó riego sin aprobación el 26 de noviembre de 2026. La calibración se conserva en 144 seco / 91 húmedo. Son porcentajes relativos del montaje, no contenido volumétrico de agua.

Condiciones conservadoras de prueba:

- Tras arrancar se exige observar humedad válida >= mínimo +5 (45% con mínimo 40). No arranca directamente al encontrar una sonda seca o al aire.
- Una vez armado, humedad por debajo del mínimo durante 60 segundos habilita un pulso de hasta 5 segundos (o el límite remoto si es menor).
- Separación mínima de 15 minutos y presupuesto persistente de tres ciclos. Reiniciar no renueva ese presupuesto.
- Tras 3 minutos, si no subió al menos 2 puntos frente al inicio, se bloquean nuevos ciclos automáticos. No se prolonga el bombeo esperando humedad.
- La parada por web o serie suspende la automatización. Para rearmar: con sonda en suelo húmedo y bomba apagada, enviar `rearmar` por serie. `estado` muestra armado, bloqueo y presupuesto. Rearmar reinicia el presupuesto tras revisión presencial.
- La humedad máxima configurada también corta un ciclo activo.
- Ticker mantiene el límite de duración incluso durante solicitudes de red. La latencia del botón web no es una parada física inmediata.

Sin Internet, puede ejecutar pulsos automáticos ya armados si no hay confirmaciones/eventos pendientes que los bloqueen. El último ciclo offline queda en /automatic-last.json de LittleFS; no se envía con fechas inventadas al historial remoto. No es una cola durable de todos los eventos offline. Sin un reloj sincronizado al arrancar, los registros locales pueden carecer de una fecha absoluta válida.

La sonda resistiva no permite reconocer con certeza todas las desconexiones ni medir flujo o nivel del tanque. Se requiere validar el suelo húmedo de este montaje y supervisar los primeros ciclos. Valores brutos fuera del intervalo calibrado se limitan a 0–100; no usar esa saturación para concluir que la calibración sigue siendo correcta.

Pruebas de política: `g++ -std=c++11 -Wall -Wextra tests/automatic_policy.cpp -o /tmp/hidrosmart-policy-test && /tmp/hidrosmart-policy-test`. No activan hardware.
