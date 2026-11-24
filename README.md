# HidroSmart

Aplicación de riego para un cultivo de pepino con un único sensor de humedad y un ESP8266. La página consulta la humedad, el historial diario, el estado de la bomba y la configuración. HidroAI obtiene el contexto desde la API.

## Pruebas en red local

Requiere Node.js 22.13 o superior. La API usa SQLite integrado en Node. La base de datos se guarda en `data/hidrosmart.sqlite`. El archivo persiste al reiniciar y queda excluido de Git.

Si faltan dependencias, ejecuta `npm ci`. Configura el entorno local una vez:

```bash
npm run setup:local
```

El comando configura `HIDROSMART_API_URL` y genera `HIDROSMART_API_KEY` y `HIDROSMART_DEVICE_TOKEN` en el archivo privado `.env`, conservando los valores existentes de Gemini.

En una terminal:

```bash
npm run api:local
```

En otra terminal:

```bash
npm run dev:lan
```

Abre la dirección Network que imprime Vite desde un teléfono o computador en la misma Wi-Fi. El ESP8266 usará `http://<IP-del-computador>:8787/functions/v1/registrar-medicion`. La API escucha en la interfaz local y de red, y requiere las claves de prueba. El firewall del computador debe permitir los puertos 5173 y 8787 en la red privada. Las redes de invitados con aislamiento entre clientes impiden la conexión.

La página consulta automáticamente cada diez segundos. Las órdenes manuales quedan pendientes hasta que el dispositivo confirme su ejecución y reporte la bomba. Con la base vacía, los controles indican que todavía no hay comunicación.

La opción **Origen de datos → Demostración** permite revisar los flujos con datos de ejemplo. **API del cultivo** consulta el servidor configurado.

## Variables del servidor

```dotenv
HIDROSMART_API_URL=http://127.0.0.1:8787/functions/v1
HIDROSMART_API_KEY=
HIDROSMART_DEVICE_TOKEN=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

`setup:local` genera las dos claves de la API local. `HIDROSMART_API_KEY` va en el encabezado `apikey`. El ESP8266 también envía `x-device-token` en las operaciones de dispositivo. El identificador predeterminado es `esp8266-cultivo-01`; puede cambiarse con `HIDROSMART_DEVICE_ID`. `HIDROSMART_DB_PATH`, `HIDROSMART_API_PORT` y `HIDROSMART_API_HOST` son opcionales.

Agrega tu clave de Google AI Studio a `GEMINI_API_KEY`. El modelo es opcional. La web y el historial local pueden funcionar sin internet. Gemini requiere conexión a internet.

La API y la web deben reiniciarse si cambias el entorno. Las claves se usan desde el servidor, sin prefijo `VITE_`. Para una web alojada en Vercel, configura una API accesible desde ese servidor. La dirección `127.0.0.1` se refiere al propio computador donde corre el proceso.

## Usar Supabase

Quita `HIDROSMART_API_URL` del entorno para seleccionar Supabase. Configura:

```dotenv
SUPABASE_BASEURL=https://xwdbbunxjpntwlclhehu.supabase.co/functions/v1
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_DEVICE_ID=hidrosmart-esp8266-01
SUPABASE_OPERATOR_TOKEN=
SUPABASE_COMMANDS_ENABLED=false
```

El adaptador usa los nombres y formatos comprobados de las Edge Functions del [contrato recibido](docs/HIDROSMART%20API.md). `SUPABASE_OPERATOR_TOKEN` es un secreto de servidor que debe coincidir con `HIDROSMART_OPERATOR_TOKEN` en Supabase; nunca debe usar el prefijo `VITE_`. Protege la actualización de configuración y la creación de órdenes. `SUPABASE_COMMANDS_ENABLED` debe permanecer en `false` hasta que el firmware consulte, ejecute y confirme comandos; así la web no ofrece un control que el dispositivo todavía no puede atender.

En Vercel no configures `HIDROSMART_API_URL`: una dirección local no es accesible desde el despliegue. Configura las cinco variables anteriores en el entorno Production y vuelve a desplegar.

## Contrato local

La API local usa los nombres de las Edge Functions del anexo. Su contrato se puede comprobar en `server/local-api.js`.

| Operación | Método y función |
| --- | --- |
| Estado del sensor y bomba | GET obtener-estado |
| Última medición válida | GET obtener-ultima-medicion |
| Mediciones e historial de riegos | GET obtener-historial-mediciones / obtener-historial-riegos |
| Obtener y guardar configuración | GET obtener-configuracion / PUT actualizar-configuracion |
| Contexto para HidroAI | GET obtener-contexto-hidroai |
| Enviar una lectura | POST registrar-medicion |
| Informar estado de bomba | POST actualizar-estado-dispositivo |
| Registrar inicio o fin | POST registrar-evento-riego |
| Solicitar inicio o parada | POST crear-comando-riego |
| Consultar comando pendiente | GET obtener-comando-pendiente |
| Confirmar o rechazar comando | POST actualizar-estado-comando |

Los historiales aceptan `desde` inclusivo, `hasta` exclusivo, `limite` de 1 a 100 y `offset`. Los días se calculan en America/Bogota. El volumen local se expresa en litros. El caudal queda sin configurar hasta medirlo.

El formato de una medición coincide con el ejemplo del anexo y puede incluir un `id` estable para deduplicar reintentos. Los registros inválidos no aparecen como última medición ni en el historial visible. La API local exige humedad finita entre 0 y 100. Es una escala relativa que debe calibrarse en el sustrato.

Los comandos de operador reciben `{id, accion}`, con `accion` igual a `iniciar` o `detener`. El dispositivo recibe `data.comando`, que puede ser `null`, y responde con `{comando_id, estado}`, donde `estado` es `ejecutada` o `rechazada`. Los comandos vencen en 15 segundos. El reporte de bomba recibe `{dispositivo_id, bomba_activa}`. Se considera reciente durante 90 segundos. Registrar una lectura mantiene el último estado de bomba conocido.

La incorporación del ESP8266 se documenta en [el esquema de conexiones](docs/CONEXIONES-ESP8266.md) y [la especificación del dispositivo](SPEC-control-dispositivo.md). La plantilla pública es `firmware/config.example.h`; `firmware/config.local.h` contiene la configuración privada, excluida de Git. Los valores iniciales de 60%, 80% y 60 segundos son parámetros de prueba.

## Verificación

```bash
node --test tests/local-api.test.js
npm run test:api
npm run lint
npm run build
```

Las pruebas automatizadas usan una base temporal aislada con datos sintéticos. `test:api` solo consulta la API seleccionada por el entorno. La conversación con Gemini usa `/api/hidroai/chat` en el servidor de Vite y en Vercel.
