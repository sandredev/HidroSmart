# Comprobación de Supabase — 24 de noviembre de 2026

Proyecto: xwdbbunxjpntwlclhehu. Pruebas HTTP autenticadas sin modificar datos. Se encontró la publishable key en `.env.example`, se trasladó al `.env` privado (0600) y se dejó la plantilla sin valor.

Las seis funciones de consulta exigen `dispositivo_id` en query: sin él responden 400 PARAMETRO_REQUERIDO. Con `esp8266-cultivo-01`:

| Función | HTTP | Resultado |
| --- | --- | --- |
| obtener-estado | 404 | DISPOSITIVO_NO_ENCONTRADO |
| obtener-configuracion | 404 | DISPOSITIVO_NO_ENCONTRADO |
| obtener-contexto-hidroai | 404 | DISPOSITIVO_NO_ENCONTRADO |
| obtener-ultima-medicion | 404 | MEDICION_NO_ENCONTRADA |
| obtener-historial-mediciones | 200 | mediciones vacías; paginacion con pagina/limite/total/total_paginas |
| obtener-historial-riegos | 200 | riegos vacíos; misma estructura de paginación |

`obtener-comando-pendiente` con solo publishable key responde 401; aún no se verificó su contrato de autenticación desde el código remoto. No se reutilizó el token privado de la API local contra otro backend. No se crearon órdenes ni mediciones sintéticas en Supabase.

Ajustes: el adaptador remoto agrega dispositivo_id (SUPABASE_DEVICE_ID, alternativamente HIDROSMART_DEVICE_ID o id predeterminado); el backend local no cambia. `node scripts/test-supabase.mjs --supabase` permite seleccionar explícitamente Supabase para pruebas, sin cambiar `.env` ni la aplicación.

Integración MCP: se encontró un plugin Supabase disponible pero no conectado en esta sesión. Se solicitó su conexión. Tener acceso a la organización en el navegador no expone automáticamente herramientas MCP. Pendiente: conectar, inspeccionar código de funciones y dispositivo existente; después determinar id correcto o crear registro/configuración según esquema real, y verificar permisos de dispositivo.

Firmware: soporta contraseña Wi-Fi vacía, compilación exitosa. No se cargó esta versión ni se probó WiFi Unimagdalena físicamente. La URL sigue siendo HTTP local del computador: el diagnóstico bloquea el envío de claves si la red no tiene contraseña. Falta implementar HTTPS con validación de certificados para migrar a Supabase. También deben comprobarse portal cautivo, banda 2,4 GHz y aislamiento de clientes en el lugar.

La disponibilidad de funciones y la respuesta 200 de historiales no demuestran todavía que la integración completa funcione: faltan dispositivo registrado, configuración, escritura de mediciones y ciclo de órdenes/eventos.

## Actualización tras conectar MCP

Acceso MCP confirmado al proyecto activo HIDROSMART API. La consulta SQL directa encontró el dispositivo existente `hidrosmart-esp8266-01`; el recuento aproximado inicial de list_tables indicaba 0 y no se tomó como prueba definitiva. No se crearon registros duplicados ni se modificó el esquema. Configuración real existente: mínimo 40, máximo 70, límite 30 s.

Se configuró SUPABASE_DEVICE_ID en .env y CLOUD_DEVICE_ID en supabase.local.h. El identificador local del backend SQLite no se cambió. La configuración remota usa data.configuracion con humedad_minima/humedad_maxima, diferente del objeto umbrales_humedad local; se adaptó el normalizador y se añadió una prueba de ese formato.

Se inspeccionó registrar-medicion: auth publishable, x-device-token comparado con secreto HIDROSMART_DEVICE_TOKEN, RPC registrar_medicion. La escritura debe probarse por Edge Function con el token real, no mediante SQL privilegiado para simular integración. El token cloud continúa pendiente; MCP no entrega el valor del secreto de Edge Functions. No se rotó ni se sustituyó.

Advisors health sin avisos. Seguridad informa RLS habilitado sin políticas en las cinco tablas, de nivel informativo: las operaciones observadas usan funciones privilegiadas. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy. No se añadieron políticas públicas para evitar ese aviso.
