# Prueba supervisada del prototipo

Entorno PlatformIO: control_cloud. Calibración persistida en código separado: seco 144, húmedo 91. Wi-Fi y tokens permanecen en cabeceras .local.h excluidas de Git. D1/GPIO5 controla un NPN con resistencia de base 1k y pull-down 10k; HIGH activa el módulo de relé activo bajo.

El firmware arranca apagado, consulta y reclama órdenes de Supabase, confirma por PATCH y registra eventos con los formatos remotos comprobados. Nunca inicia automáticamente por humedad baja. Lee configuración cada minuto y limita todos los ciclos a 30 segundos, con valor inicial de 5 segundos. El corte local usa Ticker y no depende de HTTP.

La pérdida de Wi-Fi durante un ciclo remoto solicita parada. Sin Internet se conserva lectura y parada por USB; `iniciar` por USB permite un pulso local aprobado de 5 segundos, sin historial remoto de ese pulso. No hay modo automático autónomo ni sensor de nivel del tanque.

La memoria LittleFS conserva la última orden antes de energizar, evitando repetición tras reinicio. Un evento interrumpido por reinicio bloquea nuevos inicios hasta revisión; no se inventa su duración. Un error de memoria también bloquea el inicio. El estado de bomba reporta la salida lógica; no hay realimentación de corriente/caudal que confirme movimiento físico.

Pruebas necesarias antes de dejar plantas sin supervisión:

- Arranque y reinicio apagados con el montaje real.
- Iniciar desde web con bomba sin alimentación; confirmar clic y vuelta a apagado.
- Pulso con agua y salida dirigida a recipiente, confirmar parada física y evento cerrado.
- Parada manual y pérdida de conexión durante un ciclo.
- Confirmar que no se repite una orden tras reinicio.

El correo funciona mediante `npm run alerts` en el computador; no es un servicio cloud desplegado. Requiere mediciones recientes y proceso ejecutándose. Tres lecturas calibradas bajas distintas generan una alerta; recuperación mínimo +5 rearma. Aire y suelo seco no se distinguen físicamente con esta sonda.
