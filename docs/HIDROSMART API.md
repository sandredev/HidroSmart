CONTRATO DE LA API REST DE HIDROSMART

PROPÓSITO Y ALCANCE

HidroSmart es un sistema de riego por goteo automatizado para un cultivo
de pepino. Un ESP8266 obtiene mediciones de humedad y controla el riego;
una aplicación web y el asistente HidroAI también consumen información
del sistema.

Esta API REST es la interfaz de comunicación entre el ESP8266, la
aplicación web y HidroAI. Recibe solicitudes, valida los datos, gestiona
las respuestas y comunica las operaciones al backend. Supabase se
utilizará exclusivamente como almacenamiento de datos. Este contrato no
expone credenciales de Supabase ni define su esquema.

El control local de la bomba debe seguir funcionando aunque el backend
no esté disponible. La disponibilidad de esta API no debe ser un
requisito para activar, detener ni proteger localmente la bomba.

CONVENCIONES GENERALES

Base URL: https://DOMINIO-DEL-BACKEND/api/v1

Formato de intercambio: JSON (Content-Type: application/json en
solicitudes con cuerpo; respuestas JSON).

Fechas: formato ISO 8601, preferiblemente en UTC y con zona horaria
explícita. Ejemplo: 2026-11-05T18:30:00Z.

Respuesta exitosa: cada endpoint define su estructura en la sección
correspondiente.

Respuesta de error uniforme:

{ "ok": false, "error": { "codigo": "CODIGO_DE_ERROR", "mensaje":
"Descripción del error." } }

Los nombres y valores enumerados expresamente en este contrato son parte
del contrato. Los datos no especificados se indican como pendientes de
definición y no deben inferirse como reglas de negocio.

CÓDIGOS HTTP

La API puede responder con los siguientes códigos, según el resultado:

Código: 200 Significado: Solicitud procesada correctamente.

Código: 201 Significado: Recurso o evento creado correctamente.

Código: 400 Significado: Solicitud mal formada, parámetros ausentes o
formato inválido.

Código: 401 Significado: Falta autenticación válida.

Código: 403 Significado: La identidad autenticada no tiene autorización
para la operación.

Código: 404 Significado: No se encontró el recurso solicitado o el
evento relacionado.

Código: 409 Significado: Conflicto con el estado existente, por ejemplo,
una transición de evento incompatible.

Código: 422 Significado: La solicitud tiene formato válido, pero uno o
más valores no cumplen las validaciones del contrato.

Código: 500 Significado: Error interno no esperado.

Código: 503 Significado: El servicio o backend necesario no está
disponible temporalmente.

El uso de 400 frente a 422 en validaciones concretas, así como los
códigos y mensajes de error específicos, quedan pendientes de
definición.

AUTENTICACIÓN Y AUTORIZACIÓN

La API debe aplicar autenticación y autorización apropiadas para sus
consumidores. El mecanismo, la forma de entregar y renovar credenciales,
los permisos por consumidor/endpoint y el aprovisionamiento de
identidades quedan pendientes de definición.

Como mínimo, el acceso a operaciones de escritura y a datos del sistema
debe estar protegido. No se deben incluir credenciales, claves de
servicio ni secretos de Supabase en esta API pública, en los ejemplos
del contrato ni en clientes que no deban conocerlos. Los errores 401 y
403 usan la estructura uniforme definida arriba.

ENDPOINTS

REGISTRAR UNA MEDICIÓN

Método y ruta: POST /mediciones

Consumidor: ESP8266.

Propósito: recibir y registrar una lectura de humedad del dispositivo.

Parámetros de ruta o consulta: ninguno.

Solicitud: objeto JSON.

Campos:

Campo: dispositivo_id Tipo: string Requerido: Sí Descripción:
Identificador del dispositivo que produjo la lectura.

Campo: humedad Tipo: number Requerido: Sí Descripción: Valor de humedad
de la medición. Unidad, escala y límites aceptables: pendientes de
definición.

Campo: valor_original Tipo: number Requerido: No Descripción: Valor
original asociado a la lectura, si corresponde. Significado y unidad:
pendientes de definición.

Campo: tipo_lectura Tipo: string Requerido: Sí Descripción: Tipo de
lectura: relativa o calibrada.

Campo: valida Tipo: boolean Requerido: Sí Descripción: Indica si la
medición se considera válida.

Campo: fecha_medicion Tipo: string (ISO 8601) Requerido: Sí Descripción:
Fecha y hora en que se tomó la lectura.

Ejemplo de solicitud:

{ "dispositivo_id": "esp8266-cultivo-01", "humedad": 42.5,
"valor_original": 685, "tipo_lectura": "calibrada", "valida": true,
"fecha_medicion": "2026-11-05T18:30:00Z" }

Respuesta exitosa --- 201 Created:

{ "ok": true, "data": { "medicion": { "id":
"`<pendiente de definición>`{=html}", "dispositivo_id":
"esp8266-cultivo-01", "humedad": 42.5, "valor_original": 685,
"tipo_lectura": "calibrada", "valida": true, "fecha_medicion":
"2026-11-05T18:30:00Z" } } }

El identificador y el objeto de respuesta deben confirmarse; id se
muestra solo como marcador pendiente.

Códigos HTTP posibles: 201, 400, 401, 403, 422, 500, 503.

Regla de validez: una medición con valida: false no debe considerarse
una medición válida ni usarse como última medición válida. Si estas
mediciones se almacenan, aparecen en consultas o son rechazadas, queda
pendiente de definición. La API debe validar el tipo de valida; los
criterios físicos para determinar si una lectura es válida también
quedan pendientes.

OBTENER LA ÚLTIMA MEDICIÓN VÁLIDA

Método y ruta: GET /mediciones/ultima

Consumidor: aplicación web. Otros consumidores: pendientes de
definición.

Propósito: obtener la medición válida más reciente.

Parámetros de ruta o consulta: ninguno.

Solicitud: no tiene cuerpo.

Respuesta exitosa --- 200 OK:

{ "ok": true, "data": { "medicion": { "id":
"`<pendiente de definición>`{=html}", "dispositivo_id":
"esp8266-cultivo-01", "humedad": 42.5, "valor_original": 685,
"tipo_lectura": "calibrada", "valida": true, "fecha_medicion":
"2026-11-05T18:30:00Z" } } }

El campo valor_original puede omitirse cuando no esté disponible. Si aún
no existe ninguna medición válida, la representación y el código de
respuesta quedan pendientes de definición.

Códigos HTTP posibles: 200, 401, 403, 404, 500, 503.

Criterio temporal para determinar cuál medición es la más reciente
cuando las fechas empatan: pendiente de definición.

CONSULTAR HISTORIAL DE MEDICIONES

Método y ruta: GET /mediciones/historial

Consumidor: aplicación web e HidroAI.

Propósito: consultar mediciones dentro de un periodo y con un límite
opcional de resultados.

Parámetros de consulta:

Parámetro: desde Tipo: string (ISO 8601) Requerido: No Descripción:
Inicio del periodo.

Parámetro: hasta Tipo: string (ISO 8601) Requerido: No Descripción: Fin
del periodo.

Parámetro: limite Tipo: integer Requerido: No Descripción: Máximo de
resultados solicitados. Rango, valor predeterminado y comportamiento al
exceder el máximo: pendientes de definición.

Solicitud: no tiene cuerpo.

Respuesta exitosa --- 200 OK:

{ "ok": true, "data": { "mediciones": \[ { "id":
"`<pendiente de definición>`{=html}", "dispositivo_id":
"esp8266-cultivo-01", "humedad": 42.5, "valor_original": 685,
"tipo_lectura": "calibrada", "valida": true, "fecha_medicion":
"2026-11-05T18:30:00Z" } \] } }

valor_original puede omitirse si no está disponible. Si el historial
incluye mediciones inválidas, cómo ordena sus resultados y si soporta
paginación adicional son aspectos pendientes de definición. Las
mediciones inválidas nunca deben contarse como válidas.

Códigos HTTP posibles: 200, 400, 401, 403, 422, 500, 503.

Ejemplo de solicitud:

GET
/mediciones/historial?desde=2026-11-01T00%3A00%3A00Z&hasta=2026-11-05T23%3A59%3A59Z&limite=100

REGISTRAR INICIO O FIN DE UN RIEGO

Método y ruta: POST /riegos

Consumidor: ESP8266.

Propósito: registrar el inicio o la finalización de un evento de riego.

Parámetros de ruta o consulta: ninguno.

Solicitud: objeto JSON discriminado por accion. Los dos formatos
siguientes son alternativas.

INICIO

Campos:

Campo: accion Tipo: string Requerido: Sí Descripción: Debe ser inicio.

Campo: motivo Tipo: string Requerido: Sí Descripción: Debe ser
automatico, manual o seguridad.

Campo: fecha Tipo: string (ISO 8601) Requerido: Sí Descripción: Fecha y
hora del inicio.

Campo: humedad Tipo: number Requerido: Sí Descripción: Humedad asociada
al inicio. Unidad, escala y límites: pendientes de definición.

Ejemplo de solicitud:

{ "accion": "inicio", "motivo": "automatico", "fecha":
"2026-11-05T18:32:00Z", "humedad": 42.5 }

FIN

Campos:

Campo: accion Tipo: string Requerido: Sí Descripción: Debe ser fin.

Campo: evento_id Tipo: string Requerido: Sí Descripción: Identificador
del evento de inicio que se está cerrando.

Campo: fecha Tipo: string (ISO 8601) Requerido: Sí Descripción: Fecha y
hora del fin.

Campo: humedad Tipo: number Requerido: Sí Descripción: Humedad asociada
al fin. Unidad, escala y límites: pendientes de definición.

Campo: duracion_segundos Tipo: number Requerido: Sí Descripción:
Duración del riego en segundos.

Campo: volumen Tipo: number Requerido: No Descripción: Volumen de agua,
si se dispone de él. Unidad y límites: pendientes de definición.

Campo: tipo_volumen Tipo: string Requerido: Condicional Descripción: Si
se informa volumen, indica estimado o medido. Reglas cuando no se
informa volumen: pendientes de definición.

Ejemplo de solicitud:

{ "accion": "fin", "evento_id":
"`<id devuelto al registrar el inicio>`{=html}", "fecha":
"2026-11-05T18:34:30Z", "humedad": 48.2, "duracion_segundos": 150,
"volumen": 3.4, "tipo_volumen": "estimado" }

Respuesta exitosa --- 201 Created:

Para accion: "inicio":

{ "ok": true, "data": { "evento_id":
"`<identificador generado por la API>`{=html}", "accion": "inicio",
"motivo": "automatico", "fecha": "2026-11-05T18:32:00Z", "humedad": 42.5
} }

Para accion: "fin":

{ "ok": true, "data": { "evento_id":
"`<identificador del evento>`{=html}", "accion": "fin", "fecha":
"2026-11-05T18:34:30Z", "humedad": 48.2, "duracion_segundos": 150,
"volumen": 3.4, "tipo_volumen": "estimado" } }

Códigos HTTP posibles: 201, 400, 401, 403, 404, 409, 422, 500, 503.

Relación de eventos: el fin debe referenciar mediante evento_id el
inicio correspondiente. La API debe validar esa relación y no cerrar un
evento inexistente. Restricciones adicionales sobre estados, duplicados
o secuencia de eventos quedan pendientes.

Volumen: tipo_volumen debe distinguir explícitamente entre estimado y
medido; no deben tratarse como equivalentes. Las unidades y el método de
cálculo/medición quedan pendientes de definición.

CONSULTAR HISTORIAL DE RIEGOS

Método y ruta: GET /riegos

Consumidor: aplicación web e HidroAI.

Propósito: consultar eventos de riego con filtros de fecha y límite.

Parámetros de consulta:

Parámetro: desde Tipo: string (ISO 8601) Requerido: No Descripción:
Inicio del periodo.

Parámetro: hasta Tipo: string (ISO 8601) Requerido: No Descripción: Fin
del periodo.

Parámetro: limite Tipo: integer Requerido: No Descripción: Máximo de
resultados solicitados. Rango, valor predeterminado y comportamiento al
exceder el máximo: pendientes de definición.

Solicitud: no tiene cuerpo.

Respuesta exitosa --- 200 OK:

{ "ok": true, "data": { "riegos": \[ { "evento_id":
"`<pendiente de definición>`{=html}", "motivo": "automatico",
"fecha_inicio": "2026-11-05T18:32:00Z", "fecha_fin":
"2026-11-05T18:34:30Z", "humedad_inicio": 42.5, "humedad_fin": 48.2,
"duracion_segundos": 150, "volumen": 3.4, "tipo_volumen": "estimado" }
\] } }

La representación consolidada de inicio y fin como un solo objeto de
historial es ilustrativa; forma exacta, ordenamiento, tratamiento de
eventos aún abiertos y paginación quedan pendientes de definición.
volumen y tipo_volumen se omiten cuando no estén disponibles.

Códigos HTTP posibles: 200, 400, 401, 403, 422, 500, 503.

Ejemplo de solicitud:

GET
/riegos?desde=2026-11-01T00%3A00%3A00Z&hasta=2026-11-05T23%3A59%3A59Z&limite=50

CONSULTAR ESTADO DEL DISPOSITIVO

Método y ruta: GET /estado

Consumidor: aplicación web. Otros consumidores: pendientes de
definición.

Propósito: consultar el estado conocido del dispositivo, su última
comunicación, el estado de la bomba y la humedad actual.

Parámetros de ruta o consulta: ninguno.

Solicitud: no tiene cuerpo.

Respuesta exitosa --- 200 OK:

{ "ok": true, "data": { "dispositivo_id": "esp8266-cultivo-01",
"ultima_comunicacion": "2026-11-05T18:30:00Z", "bomba_activa": false,
"humedad_actual": 42.5 } }

Los nombres/valores para estados desconocidos o ausencia de
comunicación, la vigencia de humedad_actual y la fuente de actualización
del estado quedan pendientes de definición. Este endpoint informa el
estado; no sustituye el control local de la bomba.

Códigos HTTP posibles: 200, 401, 403, 404, 500, 503.

OBTENER CONFIGURACIÓN

Método y ruta: GET /configuracion

Consumidor: aplicación web y ESP8266. Otros consumidores: pendientes de
definición.

Propósito: obtener los umbrales de humedad, el tiempo máximo de riego y
el caudal configurados.

Parámetros de ruta o consulta: ninguno.

Solicitud: no tiene cuerpo.

Respuesta exitosa --- 200 OK:

{ "ok": true, "data": { "umbrales_humedad": { "minimo":
"`<pendiente de definición>`{=html}", "maximo":
"`<pendiente de definición>`{=html}" }, "tiempo_maximo_riego_segundos":
"`<pendiente de definición>`{=html}", "caudal":
"`<pendiente de definición>`{=html}" } }

Los nombres y la semántica exactos de los umbrales, las unidades del
caudal y si alguno de estos valores puede ser nulo quedan pendientes de
definición. Los marcadores deben reemplazarse por valores numéricos
cuando se establezcan los tipos/unidades.

Códigos HTTP posibles: 200, 401, 403, 404, 500, 503.

ACTUALIZAR CONFIGURACIÓN

Método y ruta: PUT /configuracion

Consumidor: aplicación web. Otros consumidores: pendientes de
definición.

Propósito: actualizar los umbrales de humedad y el tiempo máximo de
riego.

Parámetros de ruta o consulta: ninguno.

Solicitud: objeto JSON. Los nombres de campos indicados siguen
pendientes de confirmación, ya que el contrato funcional no especifica
su nomenclatura.

{ "umbrales_humedad": { "minimo": "`<pendiente de definición>`{=html}",
"maximo": "`<pendiente de definición>`{=html}" },
"tiempo_maximo_riego_segundos": "`<pendiente de definición>`{=html}" }

Los umbrales deben validarse: rango permitido, unidad, relación entre
umbral mínimo y máximo, e inclusión o exclusión de límites están
pendientes de definición. tiempo_maximo_riego_segundos debe ser mayor
que cero. No se actualiza el caudal mediante este endpoint, pues la
operación descrita solo contempla los umbrales y el tiempo máximo.

Respuesta exitosa --- 200 OK:

{ "ok": true, "data": { "configuracion": { "umbrales_humedad": {
"minimo": "`<valor aplicado>`{=html}", "maximo":
"`<valor aplicado>`{=html}" }, "tiempo_maximo_riego_segundos":
"`<valor aplicado>`{=html}", "caudal":
"`<valor sin modificación>`{=html}" } } }

Si se devuelve la configuración completa o únicamente los campos
modificados, así como los nombres y tipos definitivos, queda pendiente
de definición.

Códigos HTTP posibles: 200, 400, 401, 403, 404, 422, 500, 503.

OBTENER CONTEXTO PARA HIDROAI

Método y ruta: GET /hidroai/contexto

Consumidor: HidroAI.

Propósito: proporcionar el contexto del sistema requerido por el
asistente.

Parámetros de ruta o consulta: ninguno definido.

Solicitud: no tiene cuerpo.

Respuesta exitosa --- 200 OK:

{ "ok": true, "data": { "humedad_actual": 42.5, "estado_bomba": false,
"ultima_medicion": { "id": "`<pendiente de definición>`{=html}",
"dispositivo_id": "esp8266-cultivo-01", "humedad": 42.5,
"valor_original": 685, "tipo_lectura": "calibrada", "valida": true,
"fecha_medicion": "2026-11-05T18:30:00Z" }, "historial_mediciones":
\[\], "historial_riegos": \[\], "configuracion": { "umbrales_humedad": {
"minimo": "`<pendiente de definición>`{=html}", "maximo":
"`<pendiente de definición>`{=html}" }, "tiempo_maximo_riego_segundos":
"`<pendiente de definición>`{=html}", "caudal":
"`<pendiente de definición>`{=html}" } } }

El contenido de las listas, su periodo y límite, el comportamiento
cuando no existe una medición, la frescura de humedad_actual, y si la
respuesta debe omitir campos no disponibles quedan pendientes de
definición. El contexto incluye la humedad actual, el estado de la
bomba, la última medición, el historial de mediciones, el historial de
riegos y la configuración.

Códigos HTTP posibles: 200, 401, 403, 404, 500, 503.

PENDIENTES DE DEFINICIÓN

Antes de considerar cerrado el contrato de integración, deben acordarse
como mínimo:

-   Los nombres, tipos definitivos y formato de los campos de umbrales
    de humedad, incluyendo unidad, rango y validación de la relación
    entre límites.

-   La escala, unidad, rango y reglas de validez de humedad, y el
    significado/unidad de valor_original.

-   Las unidades y restricciones de volumen y caudal; cómo se determina
    un volumen estimado o medido.

-   Los formatos definitivos de las respuestas y los identificadores de
    medición/evento, más la respuesta cuando no exista medición válida.

-   Si mediciones inválidas se almacenan y aparecen en los
    historiales/contextos; el endpoint de última medición siempre debe
    excluirlas.

-   La ordenación, paginación, límites por defecto/máximos y semántica
    de inclusión de fechas para los historiales.

-   El ciclo de vida de eventos de riego: transiciones permitidas,
    solicitudes duplicadas y tratamiento de cierres inválidos.

-   La estructura/estados de /estado cuando el dispositivo no haya
    comunicado o el dato no esté disponible, y cómo se actualiza ese
    estado.

-   Qué valores reciben las respuestas de /configuracion y
    /hidroai/contexto cuando no exista configuración o dato.

-   El mecanismo de autenticación, permisos por actor/endpoint, gestión
    de identidades y requisitos de transporte.

-   Los códigos de error de aplicación y la selección concreta entre 400
    y 422 para cada validación.

------------------------------------------------------------------------

# ANEXO DE INTEGRACIÓN TÉCNICA CON SUPABASE

## Acceso del colaborador, API Keys, Edge Functions, base de datos y seguridad

**Propósito del anexo:** complementar el contrato funcional anterior sin
reemplazarlo. El contrato original se conserva íntegramente. Este anexo
documenta la infraestructura Supabase que ya existe y los pasos para que
un segundo desarrollador pueda integrarse al frontend, ESP8266 y
backend.

**Criterio de lectura:** se distinguen los datos confirmados por las
capturas y el código revisado de los aspectos que todavía requieren
inspección. Una ruta lógica del contrato original no debe confundirse
con la URL real de una Edge Function desplegada.

## A.1. Datos del proyecto Supabase

  ---------------------------------------------------------------------------------------------
  Dato                                Valor
  ----------------------------------- ---------------------------------------------------------
  Proyecto                            HIDROSMART API

  Project reference                   `xwdbbunxjpntwlclhehu`

  Estado observado después de la      `Healthy`
  reactivación

  Plan observado                      Free

  Región observada                    South America (São Paulo), `sa-east-1`

  Tamaño de cómputo observado         Nano

  Project URL                         `https://xwdbbunxjpntwlclhehu.supabase.co`

  Base URL de Edge Functions          `https://xwdbbunxjpntwlclhehu.supabase.co/functions/v1`
  ---------------------------------------------------------------------------------------------

La URL del proyecto y la clave publishable identifican el proyecto para
los clientes. No conceden por sí mismas acceso al Dashboard ni
identifican a una persona.

## A.2. Cómo agregar al compañero al proyecto

**La API Key no crea un usuario de Supabase ni le da acceso al
Dashboard.** Para que el compañero pueda consultar y trabajar con el
proyecto desde Supabase, debe entrar con su propia cuenta y recibir una
invitación.

### Procedimiento recomendado

1.  Pedirle al compañero el correo electrónico con el que tiene ---o
    creará--- su cuenta de Supabase.
2.  Entrar al Dashboard de Supabase con la cuenta propietaria.
3.  Abrir la organización a la que pertenece `HIDROSMART API`.
4.  Entrar a la configuración del equipo u organización (`Team` /
    `Team settings`).
5.  Seleccionar la opción para invitar a un miembro (`Invite member`).
6.  Escribir el correo del compañero.
7.  Si el Dashboard permite asignar un rol limitado al proyecto,
    seleccionar únicamente `HIDROSMART API` y asignar el rol
    **Developer**.
8.  Enviar la invitación.
9.  El compañero debe aceptar la invitación desde su propio correo y
    entrar con su propia cuenta.

La invitación de Supabase tiene una vigencia limitada (actualmente 24
horas, según la documentación oficial). Si expira, se debe enviar otra.

### Rol recomendado

-   **Developer:** opción recomendada para que el compañero trabaje con
    el contenido del proyecto sin concederle control total de la
    organización o de la configuración del proyecto.
-   **Owner / Administrator:** no asignar para una integración normal.
    Son roles de privilegios amplios.
-   **Read-Only:** no sirve si necesita editar código o trabajar sobre
    el contenido del proyecto.
-   Si el plan o la pantalla no permite limitar el acceso a un solo
    proyecto, revisar cuidadosamente el alcance de la invitación antes
    de enviarla. No conceder un rol superior solo para evitar ese paso.

El compañero debe usar su propia cuenta. No se debe compartir la
contraseña de la propietaria.

**Importante sobre secretos:** la gestión de secretos de Edge Functions
requiere permisos elevados. Si el compañero no tiene permiso para crear,
editar o eliminar secretos, la propietaria del proyecto debe realizar
esos cambios o autorizar el rol correspondiente. No es necesario
entregarle la contraseña de la propietaria.

Documentación oficial: -
https://supabase.com/docs/guides/platform/access-control

## A.3. API Keys: cuáles existen y para qué sirven

Supabase distingue las claves de aplicación de las identidades de
usuario.

  ----------------------------------------------------------------------------
  Credencial             Uso               Dónde puede estar Tratamiento
  ---------------------- ----------------- ----------------- -----------------
  `sb_publishable_...`   Identifica el     Frontend y        No es una
                         componente        clientes          contraseña. Puede
                         cliente que llama públicos; también ser visible, pero
                         a Supabase        puede enviarse    el acceso
                                           desde ESP8266     efectivo debe
                                                             estar protegido
                                                             por autorización,
                                                             permisos y RLS
                                                             donde corresponda

  `sb_secret_...`        Acceso            Backend seguro /  Secreto. Nunca
                         privilegiado      Edge Functions /  incluir en
                         desde componentes servidor          frontend,
                         backend           protegido         firmware
                         controlados                         distribuido,
                                                             repositorios ni
                                                             documentos
                                                             compartidos

  `anon`                 Clave pública     Clientes antiguos Clave legacy;
                         heredada                            migrar a
                                                             publishable
                                                             cuando
                                                             corresponda

  `service_role`         Clave             Backend seguro    Secreto. Evitar
                         privilegiada                        exponerla; migrar
                         heredada                            a secret cuando
                                                             corresponda
  ----------------------------------------------------------------------------

### Clave publishable del proyecto

En el proyecto se identificó una clave cuyo prefijo es
`sb_publishable_`.

Para obtenerla nuevamente:

1.  Abrir el proyecto `HIDROSMART API`.
2.  Ir a `Settings` → `API Keys` (o utilizar el diálogo `Connect`).
3.  Copiar la clave de la sección **Publishable key**.
4.  Configurarla en el entorno del componente que la necesite.

Este documento no almacena el valor completo de la clave. El compañero
puede copiarla desde el Dashboard después de aceptar la invitación, o
recibirla por un canal privado. Aunque es una clave publicable, no debe
confundirse con una credencial personal ni con un permiso
administrativo.

### Diferencia entre API Key y usuario de Supabase

-   **API Key:** identifica qué aplicación o componente está llamando al
    proyecto.
-   **Usuario miembro del equipo:** permite a una persona entrar al
    Dashboard con su propia cuenta y con el rol asignado.
-   **Supabase Auth JWT:** identifica a un usuario final autenticado de
    la aplicación, si el proyecto implementa ese mecanismo.
-   **Token personalizado del dispositivo:** autentica una operación del
    ESP8266 según la lógica implementada por la Edge Function.

Una publishable key no sustituye un usuario del Dashboard, un JWT de
usuario ni un token de dispositivo.

Documentación oficial: -
https://supabase.com/docs/guides/getting-started/api-keys

## A.4. Configuración de solicitudes a Edge Functions

La URL real de una función desplegada sigue este patrón:

`https://xwdbbunxjpntwlclhehu.supabase.co/functions/v1/NOMBRE_DE_LA_FUNCION`

Encabezados generales para una solicitud JSON, cuando la función y su
autenticación lo requieran:

``` http
apikey: <SUPABASE_PUBLISHABLE_KEY>
Content-Type: application/json
```

No enviar una clave `sb_publishable_...` como si fuera un JWT en
`Authorization: Bearer`. Las API Keys nuevas se envían en el encabezado
`apikey`. El encabezado `Authorization: Bearer <JWT>` corresponde a un
JWT de usuario cuando la función requiere autenticación de usuario.

El modo de autenticación y la configuración `verify_jwt` deben
comprobarse por función. No se debe asumir que las 13 funciones usan el
mismo mecanismo únicamente porque pertenecen al mismo proyecto.

Documentación oficial: -
https://supabase.com/docs/guides/functions/auth -
https://supabase.com/docs/guides/functions/auth-headers

## A.5. Edge Functions desplegadas e identificadas

En el Dashboard se observó un total de **13 Edge Functions**:

  ------------------------------------------------------------------------------------
                           N.º Nombre desplegado                 Correspondencia
                                                                 funcional en el
                                                                 contrato original
  ---------------------------- --------------------------------- ---------------------
                             1 `actualizar-configuracion`        Actualizar
                                                                 configuración

                             2 `actualizar-estado-comando`       Actualizar el estado
                                                                 de un comando

                             3 `actualizar-estado-dispositivo`   Actualizar el estado
                                                                 del dispositivo

                             4 `crear-comando-riego`             Crear una orden de
                                                                 riego

                             5 `obtener-comando-pendiente`       Consultar órdenes
                                                                 pendientes del
                                                                 dispositivo

                             6 `obtener-configuracion`           Obtener configuración

                             7 `obtener-contexto-hidroai`        Obtener contexto para
                                                                 HidroAI

                             8 `obtener-estado`                  Consultar estado del
                                                                 dispositivo/sistema

                             9 `obtener-historial-mediciones`    Consultar historial
                                                                 de mediciones

                            10 `obtener-historial-riegos`        Consultar historial
                                                                 de riegos

                            11 `obtener-ultima-medicion`         Consultar última
                                                                 medición

                            12 `registrar-evento-riego`          Registrar inicio o
                                                                 fin de un evento de
                                                                 riego

                            13 `registrar-medicion`              Registrar una
                                                                 medición
  ------------------------------------------------------------------------------------

**Advertencia:** los nombres y la existencia de las 13 funciones están
confirmados por el Dashboard. Los métodos HTTP, cuerpos, parámetros,
encabezados, respuestas y códigos de error de las funciones distintas de
`registrar-medicion` deben verificarse leyendo su código fuente. La
correspondencia de la tabla es funcional y no demuestra por sí sola que
la ruta lógica del contrato original esté implementada literalmente.

## A.6. URLs reales y diferencia frente a las rutas lógicas del contrato

El contrato original describe rutas lógicas como `/mediciones`,
`/riegos` y `/configuracion`. La implementación observada utiliza Edge
Functions independientes bajo `/functions/v1/`.

Por ejemplo:

  ---------------------------------------------------------------------------------------------------------
  Operación lógica del    Función desplegada                URL real observada por patrón
  contrato
  ----------------------- --------------------------------- -----------------------------------------------
  Registrar medición      `registrar-medicion`              `/functions/v1/registrar-medicion`

  Obtener última medición `obtener-ultima-medicion`         `/functions/v1/obtener-ultima-medicion`

  Historial de mediciones `obtener-historial-mediciones`    `/functions/v1/obtener-historial-mediciones`

  Registrar evento de     `registrar-evento-riego`          `/functions/v1/registrar-evento-riego`
  riego

  Historial de riegos     `obtener-historial-riegos`        `/functions/v1/obtener-historial-riegos`

  Estado                  `obtener-estado`                  `/functions/v1/obtener-estado`

  Obtener configuración   `obtener-configuracion`           `/functions/v1/obtener-configuracion`

  Actualizar              `actualizar-configuracion`        `/functions/v1/actualizar-configuracion`
  configuración

  Contexto HidroAI        `obtener-contexto-hidroai`        `/functions/v1/obtener-contexto-hidroai`

  Crear comando de riego  `crear-comando-riego`             `/functions/v1/crear-comando-riego`

  Obtener comando         `obtener-comando-pendiente`       `/functions/v1/obtener-comando-pendiente`
  pendiente

  Actualizar estado de    `actualizar-estado-comando`       `/functions/v1/actualizar-estado-comando`
  comando

  Actualizar estado de    `actualizar-estado-dispositivo`   `/functions/v1/actualizar-estado-dispositivo`
  dispositivo
  ---------------------------------------------------------------------------------------------------------

Las rutas anteriores se construyen con el patrón de Supabase y los
nombres observados en el Dashboard. El método HTTP y el contrato exacto
de cada una deben extraerse del código fuente.

**No implementar llamadas a `https://DOMINIO-DEL-BACKEND/api/v1/...`
directamente contra Supabase**, salvo que exista un backend intermedio o
una capa de enrutamiento que realmente publique esas rutas. La base URL
`/api/v1` del contrato original representa la interfaz lógica deseada;
la base URL actualmente observada en Supabase es `/functions/v1`.

## A.7. Primera Edge Function auditada: `registrar-medicion`

Esta sección se basa en el código TypeScript compartido y en la
definición SQL consultada en el Dashboard.

### URL y método

``` http
POST https://xwdbbunxjpntwlclhehu.supabase.co/functions/v1/registrar-medicion
```

### Autenticación confirmada en el código

La función utiliza:

``` typescript
withSupabase({ auth: "publishable" }, ...)
```

Además, verifica el encabezado personalizado:

``` http
x-device-token: <HIDROSMART_DEVICE_TOKEN>
```

La variable de entorno que compara es:

``` text
HIDROSMART_DEVICE_TOKEN
```

Si la variable no existe, el encabezado no llega o los valores no
coinciden, devuelve HTTP `401` con el código `NO_AUTORIZADO`.

El código utiliza `ctx.supabaseAdmin.rpc(...)` para llamar a la función
SQL. Este cliente realiza una operación privilegiada; no debe asumirse
que RLS protege automáticamente esta operación.

### Cuerpo de solicitud confirmado

``` json
{
  "dispositivo_id": "esp8266-cultivo-01",
  "humedad": 65.5,
  "valor_original": 655,
  "tipo_lectura": "calibrada",
  "valida": true,
  "fecha_medicion": "2026-11-18T20:30:00Z"
}
```

  --------------------------------------------------------------------------
  Campo              Tipo                         Requerido Validación
                                                            observada
  ------------------ ---------------- --------------------- ----------------
  `dispositivo_id`   string                              Sí Debe tener un
                                                            valor truthy; la
                                                            función SQL
                                                            busca el
                                                            identificador en
                                                            `dispositivos`

  `humedad`          number                              Sí Debe ser número
                                                            finito

  `valor_original`   number o null                       No Si se envía,
                                                            debe ser número
                                                            finito o null

  `tipo_lectura`     string                              Sí Solo `relativa`
                                                            o `calibrada`

  `valida`           boolean                             Sí Debe ser boolean

  `fecha_medicion`   string                              Sí Debe poder
                                                            interpretarse
                                                            mediante
                                                            `Date.parse`
  --------------------------------------------------------------------------

No se observó en el código compartido una validación de rango físico
para `humedad`, ni una validación de formato ISO 8601 estricto.

### Respuestas y errores confirmados

  --------------------------------------------------------------------------
                          HTTP Código de error         Condición
  ---------------------------- ----------------------- ---------------------
                           201 ---                     La operación SQL no
                                                       devuelve error; se
                                                       responde con el
                                                       resultado SQL

                           401 `NO_AUTORIZADO`         Token de dispositivo
                                                       ausente, incorrecto o
                                                       secreto no
                                                       configurado

                           405 `METODO_NO_PERMITIDO`   Método distinto de
                                                       POST

                           422 `DATOS_INVALIDOS`       Datos obligatorios o
                                                       tipos inválidos

                           422 `DATOS_INVALIDOS`       `valor_original` no
                                                       es numérico finito ni
                                                       null

                           500 `ERROR_REGISTRO`        Error devuelto por el
                                                       RPC SQL

                           500 `ERROR_INTERNO`         Excepción no
                                                       controlada, incluido
                                                       un JSON mal formado
  --------------------------------------------------------------------------

### Función SQL invocada

La Edge Function ejecuta:

``` typescript
ctx.supabaseAdmin.rpc("registrar_medicion", {
  p_dispositivo_id: body.dispositivo_id,
  p_humedad: body.humedad,
  p_valor_original: body.valor_original ?? null,
  p_tipo_lectura: body.tipo_lectura,
  p_valida: body.valida,
  p_fecha_medicion: body.fecha_medicion
});
```

La función SQL observada es `public.registrar_medicion`. En la
definición compartida se identificó:

-   `SECURITY DEFINER`.
-   `SET search_path TO ''`.
-   Búsqueda del dispositivo en `public.dispositivos` usando
    `dispositivo_id`.
-   Si no encuentra el dispositivo, genera `Dispositivo no encontrado`.
-   Inserta la medición en `public.mediciones`.
-   Actualiza `public.dispositivos.ultima_comunicacion` con `NOW()`.
-   Devuelve un JSON con `ok` y `data`.

La respuesta SQL observada incluye estos campos dentro de `data`:

``` json
{
  "ok": true,
  "data": {
    "id": "<id de medición>",
    "dispositivo_id": "<identificador del dispositivo>",
    "humedad": 65.5,
    "valida": true,
    "fecha_medicion": "2026-11-18T20:30:00Z"
  }
}
```

La Edge Function devuelve directamente ese resultado con HTTP `201`. Por
tanto, la respuesta observada **no** utiliza el envoltorio
`data.medicion` del ejemplo del contrato original. Además, la respuesta
SQL mostrada no devuelve `valor_original` ni `tipo_lectura`, aunque esos
valores se envían al RPC y se insertan en la tabla.

### Observaciones de seguridad de esta operación

1.  `SECURITY DEFINER` hace que la función SQL se ejecute con los
    privilegios de su propietario. Se debe revisar el propietario, los
    permisos `EXECUTE`, el `search_path` y todas las operaciones
    internas.
2.  La Edge Function usa `ctx.supabaseAdmin`; debe revisarse qué
    privilegios tiene ese cliente en el entorno actual.
3.  La protección adicional `x-device-token` está implementada, pero el
    código observado utiliza una sola variable de entorno global. No se
    ha confirmado un token individual por dispositivo.
4.  No se debe incluir `HIDROSMART_DEVICE_TOKEN` en el frontend, en
    repositorios públicos ni en el documento compartido.
5.  El firmware del ESP8266 debe tratarse como un entorno donde un
    secreto puede extraerse físicamente. Para una versión más robusta,
    evaluar credenciales individuales por dispositivo y mecanismos de
    revocación.
6.  Deben revisarse los permisos de ejecución de la función SQL y el
    comportamiento de `SECURITY DEFINER` antes de cerrar la auditoría.

## A.8. Base de datos observada en el Dashboard

En el esquema `public` se observaron estas cinco tablas:

  Tabla                      Número de columnas observado
  ------------------------ ------------------------------
  `comandos_dispositivo`                                8
  `configuracion`                                       7
  `dispositivos`                                        5
  `eventos_riego`                                      11
  `mediciones`                                          7

Estas cantidades y nombres se obtuvieron de la captura del Dashboard.
Los nombres, tipos y restricciones de todas las columnas aún deben
exportarse o consultarse para completar el esquema relacional.

En la captura, Realtime aparecía como `Disabled` para las cinco tablas.
Por tanto, la interfaz no debe depender de suscripciones Realtime hasta
que se habiliten y prueben; puede utilizar consultas periódicas mientras
tanto.

## A.9. Variables de entorno y secretos

### Secreto identificado en el código

  --------------------------------------------------------------------------------------
  Nombre                      Uso                    Componente        Clasificación
  --------------------------- ---------------------- ----------------- -----------------
  `HIDROSMART_DEVICE_TOKEN`   Comparación con        Edge Function y   Secreto
                              `x-device-token` en    ESP8266 que
                              `registrar-medicion`   invoca el
                                                     endpoint

  --------------------------------------------------------------------------------------

### Variables administradas por Supabase

El runtime de Edge Functions puede proporcionar variables como
`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` y
otras variables de plataforma. El código de cada función debe revisarse
para identificar cuáles utiliza realmente.

### Reglas de manejo

-   Los secretos de producción se configuran desde `Edge Functions` →
    `Secrets` o mediante Supabase CLI.
-   No poner secretos en archivos que se suben a Git.
-   No incluir claves secretas en variables de frontend con prefijos
    públicos como `VITE_` o `NEXT_PUBLIC_`.
-   Mantener un `.env.example` con nombres y valores de ejemplo no
    sensibles.
-   La propietaria del proyecto debe configurar los secretos de
    producción si el rol del compañero no le permite hacerlo.
-   No enviar `sb_secret_...`, `service_role` ni contraseñas de
    PostgreSQL al compañero para integrar el frontend o el ESP8266.

Documentación oficial: -
https://supabase.com/docs/guides/functions/secrets

## A.10. Configuración de entorno para el compañero

Ejemplo de archivo local de configuración del frontend (el prefijo
exacto depende del framework):

``` env
VITE_SUPABASE_URL=https://xwdbbunxjpntwlclhehu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<COPIAR_PUBLISHABLE_KEY>
```

En frameworks que usan otro prefijo público, adaptar los nombres al
framework. El valor publishable puede estar en el cliente, pero no se
debe colocar allí ninguna clave secret ni token de dispositivo.

Ejemplo de archivo de referencia para backend/Edge Functions, sin
valores reales:

``` env
SUPABASE_URL=https://xwdbbunxjpntwlclhehu.supabase.co
HIDROSMART_DEVICE_TOKEN=<CONFIGURAR_EN_SECRETS_DE_SUPABASE>
```

El archivo real con secretos debe permanecer fuera del repositorio.
Agregar `.env`, `.env.*` y archivos equivalentes al `.gitignore`,
conservando únicamente `.env.example` sin secretos.

Para el ESP8266, el firmware requiere la URL de la función, la
publishable key y el token de dispositivo configurado de forma segura.
El token no debe enviarse al frontend ni compartirse en un repositorio
público.

## A.11. Ejemplo de prueba de `registrar-medicion` en Postman

**Método:** `POST`

**URL:**

``` text
https://xwdbbunxjpntwlclhehu.supabase.co/functions/v1/registrar-medicion
```

**Headers:**

``` http
apikey: <SUPABASE_PUBLISHABLE_KEY>
Content-Type: application/json
x-device-token: <HIDROSMART_DEVICE_TOKEN>
```

**Body → raw → JSON:**

``` json
{
  "dispositivo_id": "esp8266-cultivo-01",
  "humedad": 65.5,
  "valor_original": 655,
  "tipo_lectura": "calibrada",
  "valida": true,
  "fecha_medicion": "2026-11-18T20:30:00Z"
}
```

Para una prueba real, `dispositivo_id` debe coincidir con el valor
existente en `public.dispositivos.dispositivo_id`. El token debe ser el
configurado en los Secrets de producción. No pegar valores secretos en
capturas ni en documentación compartida.

## A.12. Responsabilidades de cada componente

### Frontend

-   Consumir las Edge Functions correspondientes a consultas y
    operaciones autorizadas.
-   Mostrar mediciones, historial, estado, configuración y eventos de
    riego.
-   Solicitar comandos de riego mediante la función correspondiente.
-   No incluir `HIDROSMART_DEVICE_TOKEN`, `sb_secret_...` ni
    `service_role`.
-   No conectarse directamente con credenciales privilegiadas a
    PostgreSQL.

### ESP8266

-   Leer el sensor de humedad.
-   Enviar mediciones mediante `registrar-medicion`.
-   Consultar comandos pendientes mediante la función correspondiente.
-   Informar el estado del dispositivo y de los comandos.
-   Registrar eventos de riego según las funciones desplegadas.
-   Mantener la lógica local de seguridad y control de la bomba, incluso
    si Supabase o Internet no están disponibles.

### Backend / Supabase

-   Mantener las Edge Functions y las operaciones SQL.
-   Validar las entradas y los permisos.
-   Gestionar secretos en el entorno seguro.
-   Mantener la integridad de las mediciones, comandos y eventos.
-   Proporcionar los datos consolidados a HidroAI.

### HidroAI

-   Consumir el contexto proporcionado por `obtener-contexto-hidroai`.
-   No recibir claves secretas de Supabase.
-   No ejecutar directamente operaciones privilegiadas en la base de
    datos.

## A.13. Verificaciones pendientes antes de considerar cerrada la integración

Las siguientes tareas no se dan por realizadas. Deben verificarse en el
Dashboard o en el código fuente:

-   [ ] Invitar al compañero con su correo y asignar rol Developer con
    el menor alcance posible.
-   [ ] Confirmar que aceptó la invitación y puede abrir
    `HIDROSMART API`.
-   [ ] Entregarle la Project URL y la publishable key por un canal
    adecuado.
-   [ ] Documentar el método HTTP, encabezados, entradas, salidas y
    errores de las otras 12 Edge Functions.
-   [ ] Verificar `verify_jwt` y el modo `withSupabase` de cada Edge
    Function.
-   [ ] Obtener los tipos y restricciones de las columnas de las cinco
    tablas.
-   [ ] Verificar RLS habilitado en cada tabla.
-   [ ] Obtener las políticas RLS, los grants y los roles con permisos.
-   [ ] Revisar todas las funciones SQL llamadas por las Edge Functions.
-   [ ] Revisar `SECURITY DEFINER`, propietarios, `search_path` y
    permisos `EXECUTE`.
-   [ ] Confirmar cómo se administra y rota `HIDROSMART_DEVICE_TOKEN`.
-   [ ] Confirmar CORS, orígenes y encabezados permitidos.
-   [ ] Probar los endpoints con Postman y con el ESP8266.
-   [ ] Confirmar que el control local de la bomba no depende de la
    disponibilidad de Supabase.
-   [ ] Comparar los JSON reales con los ejemplos del contrato original
    y corregir únicamente las diferencias confirmadas.

## A.14. Instrucciones de incorporación para el compañero

Para comenzar a trabajar:

1.  Aceptar la invitación de Supabase con su propia cuenta.
2.  Abrir el proyecto `HIDROSMART API`.
3.  Consultar la Project URL y la publishable key en `Settings` →
    `API Keys`.
4.  Leer el contrato original y este anexo antes de programar.
5.  Configurar las variables locales sin incluir secretos en Git.
6.  Utilizar las URLs reales de Edge Functions bajo `/functions/v1/`.
7.  No modificar tablas, RLS, funciones SQL, secretos ni despliegues de
    producción sin coordinarlo con la responsable del proyecto.
8.  Probar primero las operaciones en un entorno controlado y documentar
    cualquier diferencia entre el contrato y la implementación.

 frontend y firmware integrados
con las funciones existentes, usando las credenciales y permisos
adecuados, sin duplicar endpoints ni introducir claves privilegiadas en
clientes públicos.

## A.15. Referencias oficiales de Supabase

-   Control de acceso y roles del equipo:
    https://supabase.com/docs/guides/platform/access-control
-   API Keys publishable y secret:
    https://supabase.com/docs/guides/getting-started/api-keys
-   Seguridad de Edge Functions:
    https://supabase.com/docs/guides/functions/auth
-   Encabezados de autorización:
    https://supabase.com/docs/guides/functions/auth-headers
-   Secrets de Edge Functions:
    https://supabase.com/docs/guides/functions/secrets

------------------------------------------------------------------------

**Fin del anexo.** El contrato funcional original permanece antes de
este anexo y debe leerse junto con él. Los puntos marcados como
pendientes no deben considerarse funcionalidades o permisos ya
implementados.
