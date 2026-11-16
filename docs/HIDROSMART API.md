# Contrato REST de HidroSmart

Contrato propuesto para integrar el prototipo. Describe una unidad de riego con un ESP8266, un sensor y una bomba para un grupo de una a tres plantas de pepino. La cantidad de plantas se registra para identificar la condición de prueba. El sistema conserva una sola lectura y un solo circuito de riego.

## Base y acceso

- `SUPABASE_BASEURL` contiene la raíz de Edge Functions (`https://<proyecto>.supabase.co/functions/v1`). Si se agrupan las rutas en una Edge Function llamada `hidrosmart`, la base final es `${SUPABASE_BASEURL}/hidrosmart`. El nombre y el despliegue requieren validación con el backend.
- La web se sirve en un entorno privado de prueba sin pantalla de inicio de sesión. Sus peticiones pasan por un proxy del mismo origen que autentica al entorno y usa credenciales de servidor. El ESP8266 autentica por HTTPS con una credencial de dispositivo independiente. La API identifica al dispositivo por esa credencial y separa los permisos de dispositivo y operador. Gemini y las credenciales de servicio de Supabase se configuran en el servidor.
- Cuerpos y respuestas en JSON. Éxito con `{"ok":true,"data":{...}}`. Error con `{"ok":false,"error":{"codigo":"...","mensaje":"..."}}`. `200` indica lectura o actualización, `201` creación y `202` una orden en cola. `400` indica formato incorrecto, `401` credencial ausente o inválida, `403` permiso insuficiente, `404` recurso inexistente, `409` conflicto de versión, orden o identificador, `422` campo fuera de rango, `429` límite de solicitudes y `503` dependencia no disponible.
- Se usan cadenas de fecha ISO 8601 con zona explícita. Las respuestas en UTC usan el sufijo `Z`. Las marcas de comunicación y los vencimientos los asigna el servidor. El historial diario de la web usa `America/Bogota`.

## Configuración y control local

`GET /configuracion` devuelve `data.configuracion`. `PUT /configuracion` recibe todos los campos editables junto con `revision` y devuelve `data.configuracion` en el mismo formato. Cambiar un valor incrementa la revisión. Una revisión desactualizada recibe `409 REVISION_DESACTUALIZADA`. Reenviar la configuración vigente con su revisión vigente devuelve la misma revisión.

```json
{
  "revision": 1,
  "umbrales_humedad": { "minimo": 60, "maximo": 80 },
  "tiempo_maximo_riego_segundos": 60,
  "cantidad_plantas": 3,
  "caudal_litros_minuto": null
}
```

| Campo editable | Validación | Uso |
| --- | --- | --- |
| `umbrales_humedad` | Números finitos entre 0 y 100. `minimo < maximo`. | Escala relativa del sensor. En automático, inicia cuando la humedad válida es menor que el mínimo. Corta al alcanzar o superar el máximo. |
| `tiempo_maximo_riego_segundos` | Entero de 1 a 300. | Límite solicitado por ciclo automático o manual. El firmware aplica además un tope físico fijado durante las pruebas de caudal y seguridad. |
| `cantidad_plantas` | Entero de 1 a 3. | Registra la cantidad usada en el ensayo. No multiplica el tiempo de riego ni estima el caudal. |

`caudal_litros_minuto` es de solo lectura y representa el caudal total del circuito. Es `null` hasta medirlo. El `PUT` omite ese campo. Los valores de ejemplo de `60%`, `80%` y `60 s` son candidatos para la demostración y la puesta en marcha supervisada. La escala 0 a 100 expresa la lectura relativa entre dos referencias del sensor en el sustrato. Calibra con una referencia seca y otra húmeda tras escurrir, verificando el sentido de la señal. Una lectura dañada, fuera del dominio calibrado o sin calibración suficiente se marca inválida. Estos porcentajes no representan contenido volumétrico ni el porcentaje de agua disponible para la planta.

El firmware conserva la última configuración válida en almacenamiento persistente y solo escribe al cambiar la revisión. Reporta esa revisión una vez aplicada. Si todavía no hay una configuración local válida, la bomba queda apagada. Las protecciones actúan con un reloj monotónico y con el sensor local. El arranque manual exige lectura válida inferior al máximo y queda sujeto al tiempo máximo, al máximo de humedad y al tope físico. Una lectura inválida impide arrancar y detiene un ciclo en curso. La bomba arranca apagada tras reinicio. El inicio de cada ciclo captura su límite. Un ajuste durante el ciclo se confirma y aplica cuando la bomba está detenida. Para no encadenar ciclos tras alcanzar el límite o tras una parada manual, el firmware bloquea el rearranque automático hasta que una lectura válida alcance al menos el mínimo y luego vuelva a caer por debajo de él. Durante la puesta en marcha debe verificarse si ese criterio requiere un mecanismo explícito de rearme.

## Consulta periódica del ESP8266

`POST /dispositivo/sincronizacion` agrupa la comprobación de órdenes, la revisión aplicada, el estado de la bomba y el envío de datos pendientes. Cadencia inicial sugerida de **5 s** con conexión estable. Son hasta 12 consultas por minuto del dispositivo, ilustrativas para un solo prototipo. Capturar y evaluar el sensor localmente sin esperar esta consulta. Enviar una nueva lectura cada **30 s** y cuando cambie el estado de la bomba. No solapar consultas. Usar un tiempo de espera de red acotado y reintentos con espera creciente hasta 60 s ante fallos. La interfaz debe esperar confirmación y distinguir retrasos de ejecución.

```json
{
  "revision_aplicada": 1,
  "bomba_activa": false,
  "mediciones": [],
  "riegos": [],
  "resultados_ordenes": []
}
```

```json
{
  "ok": true,
  "data": {
    "hora_servidor": "2026-11-15T14:00:00Z",
    "configuracion": null,
    "orden": null,
    "confirmados": { "mediciones": [], "riegos": [], "resultados_ordenes": [] }
  }
}
```

`revision_aplicada` es `null` cuando no hay configuración local. `configuracion` es `null` si coincide con la revisión vigente y contiene el objeto completo de lo contrario. `orden` contiene la siguiente orden disponible o `null`. Los demás campos de la solicitud son obligatorios. `mediciones` y `riegos` contienen los objetos descritos más abajo y `resultados_ordenes` contiene los acuses de ejecución. Un lote tiene hasta 10 objetos en cada lista. `confirmados.mediciones` enumera los `id` almacenados y `confirmados.riegos` enumera objetos con `evento_id` y `fase` (`abierto` o `cerrado`) correspondientes a lo enviado. Si un ciclo se cerró mientras viajaba un registro abierto, el acuse de la fase abierta conserva el cierre en la cola. `confirmados.resultados_ordenes` enumera los `orden_id`. El dispositivo retira los elementos confirmados de su cola local. Un fallo de validación del lote devuelve el campo o identificador afectado con `422` y deja intacto el lote. Un conflicto de identificador también rechaza todo el lote con `409` e identifica el registro en conflicto. Ante un reintento, la API confirma también los duplicados cuyo contenido coincide. El firmware aísla un elemento inválido para diagnóstico, permitiendo sincronizar el resto.

La comunicación se considera reciente durante 30 s desde la última sincronización válida. Una lectura tiene vigencia independiente de 90 s desde su propia fecha. Estos plazos son parámetros de prueba. `GET /estado` devuelve:

```json
{
  "ok": true,
  "data": {
    "dispositivo_id": "esp8266-cultivo-01",
    "conexion": "en_linea",
    "ultima_comunicacion": "2026-11-15T14:00:00Z",
    "bomba_activa": false,
    "humedad_actual": 68.4,
    "fecha_medicion": "2026-11-15T13:59:50Z",
    "revision_aplicada": 1
  }
}
```

`conexion` es `en_linea`, `sin_conexion` o `sin_comunicacion`. `bomba_activa` y `revision_aplicada` son `null` al desconocer el estado por falta de comunicación reciente. `humedad_actual` es `null` si no hay una lectura válida reciente o la conexión no está vigente. La web puede consultar por separado la última lectura válida y presentarla con su fecha.

## Órdenes manuales

`POST /ordenes` recibe `{"id":"<UUID de solicitud>","accion":"iniciar"}` o `{"id":"<UUID de solicitud>","accion":"detener"}`. Devuelve `202` con `data.orden`; repetir el mismo identificador y acción devuelve la misma orden. Reutilizar el identificador con otros datos devuelve `409`. Una orden nueva requiere comunicación reciente (`409 DISPOSITIVO_SIN_CONEXION` en caso contrario). `GET /ordenes/{id}` informa su estado.

```json
{
  "id": "95ab84f9-8962-4b5b-bbfe-fc3c4dc07228",
  "accion": "iniciar",
  "estado": "pendiente",
  "creada_en": "2026-11-15T14:00:00Z",
  "expira_en": "2026-11-15T14:00:15Z",
  "motivo": null
}
```

- `pendiente` significa que el servidor recibió la solicitud. Aceptar una orden no cambia el estado conocido de la bomba.
- La sincronización entrega órdenes pendientes no vencidas. El ESP8266 solo las aplica si puede comprobar que siguen vigentes. Durante una reconexión, los arranques vencidos se descartan. A modo de prueba, las órdenes vencen a los 15 s.
- El firmware reclama el identificador de forma persistente antes de actuar y guarda el resultado después para deduplicar reintentos. Si se reinicia durante la operación, mantiene la bomba apagada y reporta `rechazada` con motivo `RESULTADO_INCIERTO` sin volver a accionar el inicio. Reporta `{"orden_id":"<UUID>","estado":"ejecutada","motivo":null,"procesada_en":"2026-11-15T14:00:05Z"}` o el mismo formato con `estado: "rechazada"` y un motivo como `LIMITE_HUMEDAD`. `ejecutada` indica que el firmware aplicó el cambio a la salida de control o que la bomba ya tenía el estado solicitado. Sin sensor de caudal, no verifica que haya circulado agua. Una solicitud repetida con el mismo identificador nunca reinicia el temporizador del ciclo.
- La API acepta un inicio pendiente por vez y rechaza nuevos inicios mientras haya una parada pendiente. Una parada cancela un inicio pendiente y tiene prioridad en la siguiente sincronización. Si el dispositivo ya recibió el inicio, puede haber un ciclo breve hasta recibir la parada. Dos solicitudes de parada pendientes reciben la misma orden vigente, conservando la asociación con ambos identificadores para sus reintentos y consultas.
- Los demás estados de la orden son `vencida` y `cancelada`. La API deja de entregar la orden y la web muestra falta de confirmación. Un acuse tardío de una acción ejecutada válidamente antes del vencimiento puede reconciliarse con el estado y el historial. El acuse incluye `procesada_en` para esa conciliación. Al entregar una orden, el servidor informa cuánto tiempo de vigencia queda desde `hora_servidor`. El dispositivo usa un plazo local monotónico descontando la latencia observada de la consulta.
- El estado de la bomba en pantalla se deriva de `GET /estado`. Aunque falle la comunicación, el ESP8266 conserva el control local y aplica el límite de seguridad. La parada remota solo está disponible con comunicación.

## Mediciones e historial diario

`POST /mediciones` permite registrar individualmente el mismo objeto que se admite en `mediciones` durante la sincronización. Devuelve `201` con `data.medicion`, o `200` si el mismo registro ya existe. La sincronización es la ruta preferida para el firmware. El `id` es un UUID que el dispositivo genera y conserva para reintentos. `humedad` es un número entre 0 y 100 cuando `valida` es `true`; si `valida` es `false`, puede ser `null`. `valor_original` es el valor numérico de la lectura sin convertir, o `null`. El dispositivo informa `tipo_lectura` como `relativa` o `calibrada`, según si ya verificó sus referencias en el sustrato. Ambos usan la misma escala relativa.

```json
{
  "id": "dc07358e-8b69-4dbd-85ea-0a739aa8ac0a",
  "dispositivo_id": "esp8266-cultivo-01",
  "humedad": 68.4,
  "valor_original": 685,
  "tipo_lectura": "calibrada",
  "valida": true,
  "fecha_medicion": "2026-11-15T13:59:50Z"
}
```

- `GET /mediciones/ultima` devuelve `data.medicion` con la última lectura válida ordenada por `fecha_medicion` descendente y luego por `id` descendente. Devuelve `null` si no existe. Excluye lecturas inválidas o sin fecha conocida.
- `GET /mediciones/historial` devuelve `data.mediciones` con las mismas reglas de validez y `data.siguiente_cursor`.
- `GET /riegos` devuelve `data.riegos` y `data.siguiente_cursor`, ordenados por fecha de inicio y luego por `evento_id`, descendentes. Para ambos historiales se aceptan `desde` inclusivo, `hasta` exclusivo, `limite` entero de 1 a 100 (50 por defecto) y `cursor` opaco. Si se reutiliza un cursor, deben conservarse los filtros. `siguiente_cursor` es `null` cuando no hay otra página. Un riego se asigna al día de su inicio. Para el historial de hoy se consulta desde medianoche hasta la medianoche siguiente de `America/Bogota`, convirtiendo ambas horas a UTC.
- Las lecturas inválidas se conservan para diagnóstico y no aparecen en las consultas de la web ni de HidroAI.

## Registro de riegos y trabajo sin internet

`POST /riegos` admite el mismo objeto consolidado que la sincronización. Devuelve `201` al crear el ciclo y `200` al actualizarlo o reconocer un duplicado, con `data.riego`. Cada ciclo tiene un UUID generado por el ESP8266 **antes de activar** la salida de control. El dispositivo registra localmente la apertura con `fecha_fin`, `duracion_segundos`, `humedad_fin`, `motivo_fin`, `volumen` y `tipo_volumen` en `null`. Al cerrar completa el registro con el mismo `evento_id`. Un ciclo completo puede sincronizarse en una sola operación, incluso cuando la API jamás recibió su apertura. Una versión abierta que llegue después de una cerrada no la reabre. Si el mismo UUID llega con datos incompatibles, la API devuelve `409 EVENTO_INCOMPATIBLE`.

```json
{
  "evento_id": "c294222a-7e2c-4bbc-970c-389686625579",
  "motivo": "automatico",
  "fecha_inicio": "2026-11-15T13:30:00Z",
  "fecha_fin": "2026-11-15T13:30:42Z",
  "humedad_inicio": 58.4,
  "humedad_fin": 80,
  "duracion_segundos": 42,
  "motivo_fin": "umbral_maximo",
  "volumen": 0.28,
  "tipo_volumen": "estimado",
  "cantidad_plantas": 3,
  "revision_configuracion": 1
}
```

`motivo` es `automatico` o `manual`. `motivo_fin` es `manual`, `umbral_maximo`, `tiempo_maximo`, `sensor_invalido`, `reinicio` o `seguridad`. `duracion_segundos` se mide con el reloj monotónico y es un entero no negativo cuando se conoce. En una interrupción por reinicio la duración y la humedad final pueden quedar en `null`. Un riego sigue en curso mientras `motivo_fin` sea `null`. El registro captura `cantidad_plantas` y `revision_configuracion` al inicio para comparar ensayos incluso después de un cambio de ajustes. El volumen se expresa en litros. Si se conoce el caudal total, el volumen estimado es `caudal_litros_minuto × duracion_segundos / 60`. `tipo_volumen` es `estimado` o `medido` cuando hay volumen, y ambos campos son `null` si no hay datos.

El dispositivo conserva una cola local persistente de riegos suficiente para un día de prueba y la reenvía tras recuperar conexión. La retención en servidor debe cubrir por lo menos el día completo y la sincronización posterior. La medición de tiempos y el control físico siguen activos si se pierde internet. Mientras se conserve una referencia fiable de tiempo se reconstruye la fecha a partir del reloj monotónico. Si falta una referencia fiable tras un reinicio, la fecha se envía como `null`. Los datos sin fecha fiable se guardan para diagnóstico y se excluyen de los totales por día. La capacidad de la cola, el desgaste de memoria y el reloj deberán probarse en el firmware.

## HidroAI

- `GET /hidroai/contexto` devuelve `data.estado`, `data.ultima_medicion`, `data.historial_mediciones`, `data.historial_riegos` y `data.configuracion`. El contexto incluye hasta 50 mediciones válidas y 50 riegos del día, con un indicador `data.contexto_parcial` cuando se limita el resultado. Los estados desconocidos conservan su semántica de `null`.
- `POST /hidroai/chat` recibe `{"pregunta":"..."}` (1 a 1000 caracteres después de recortar espacios). El servidor obtiene el contexto y llama a Google Gemini para pruebas. Devuelve `{"ok":true,"data":{"respuesta":"..."}}`. El modelo se selecciona con `GEMINI_MODEL` y la credencial con `GEMINI_API_KEY` en el servidor. Si el proveedor falla, la API responde `503` con un mensaje para la interfaz.
- La primera integración utiliza solo análisis. Si se incorpora el modo de propuestas, HidroAI devuelve sugerencias sin permisos de escritura. Un ajuste requiere que el operador lo apruebe en la web y pasa después por `PUT /configuracion` con la revisión vigente.
