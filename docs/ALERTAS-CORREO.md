# Monitor de humedad sin bomba

Variables privadas: RESEND_API_KEY, ALERT_EMAIL_TO y ALERT_EMAIL_FROM.
Para pruebas con onboarding@resend.dev el destinatario debe ser el correo de la cuenta Resend.

Ejecutar `npm run alerts`. El proceso consulta Supabase cada diez segundos aunque la web esté cerrada. Necesita computador encendido, Internet y mediciones del ESP8266. No está desplegado como servicio cloud ni arranca automáticamente.

Solo cuentan mediciones calibradas válidas, distintas y con antigüedad máxima de 90 segundos. Tres lecturas consecutivas por debajo del mínimo generan un correo. Se rearma al recuperar mínimo + 5 puntos. La sonda al aire también puede indicar 0%; revisar su posición.

El estado y solicitudes pendientes persisten en data/alerts.sqlite (excluido de Git). No ejecutar varias instancias simultáneas. Los fallos se reintentan con la misma clave Resend; solicitudes pendientes de más de 23 horas requieren revisión manual para evitar duplicados fuera de la ventana del proveedor.

`npm run alerts -- --once` realiza una consulta. El envío aceptado por Resend no confirma entrega en bandeja. El firmware bomba_local no envía mediciones; debe restaurarse el modo sensor con Wi-Fi antes de validar alertas reales. No modificar seco=144/húmedo=91.
