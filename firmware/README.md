# Diagnóstico de red ESP8266

Esta primera etapa solo conecta Wi-Fi y consulta la API. No configura GPIO de relé, no lee A0, no publica datos inventados ni estado de bomba y no ejecuta/consume órdenes. No es todavía el firmware de riego.

Antes de cargar: IN del relé y AO del sensor desconectados del NodeMCU y bomba sin alimentación. Un GPIO sin configurar no garantiza que un relé conectado quede apagado. La apertura del puerto y la carga pueden reiniciar la placa.

Completar `HIDROSMART_WIFI_SSID` y `HIDROSMART_WIFI_PASSWORD` en `config.local.h`, ignorado por Git. Las claves existentes se copiaron allí sin mostrarlas. Usar una red de 2,4 GHz con acceso a la LAN del computador. API actual: `http://192.168.1.13:8787/functions/v1`.

Herramientas instaladas en un entorno temporal:

```sh
PLATFORMIO_CORE_DIR=/tmp/hidrosmart-platformio /tmp/hidrosmart-pio/bin/pio run -d firmware
```

Solo tras confirmar las desconexiones físicas y volver a comprobar el puerto:

```sh
PLATFORMIO_CORE_DIR=/tmp/hidrosmart-platformio /tmp/hidrosmart-pio/bin/pio run -d firmware -t upload --upload-port /dev/ttyUSB0
/tmp/hidrosmart-pio/bin/pio device monitor --port /dev/ttyUSB0 --baud 115200
```

Las herramientas de `/tmp` pueden desaparecer al reiniciar; se pueden reinstalar en un entorno Python dedicado.

Monitor: conexión/IP, HTTP de obtener-configuracion y obtener-comando-pendiente, validación de umbrales y máximo de riego. La segunda ruta comprueba también x-device-token. Una orden pendiente solo se indica: no se ejecuta ni confirma. Consultas cada 15 segundos y reintentos Wi-Fi cada 30 segundos, sin espera indefinida de conexión.

No se imprimen contraseñas, claves ni respuestas completas del servidor. El diagnóstico admite HTTP únicamente en la red local de pruebas; no usarlo para enviar claves por internet. Los binarios también contienen secretos: no compartir ni subir `.pio` a Git.

Pendiente después: calibración y conexión eléctrica segura, controlador de riego con protección independiente de esperas de red, eventos persistentes y pruebas físicas. Las esperas HTTP de este diagnóstico no son apropiadas como base de un controlador de bomba sin revisar su temporización.

## Prueba física del 24 de noviembre de 2026

Compilación y carga completadas en ESP8266EX por CP2102 `/dev/ttyUSB0`; verificación hash correcta. Arranque del diagnóstico observado por serie. No se accionaron salidas ni se publicaron mediciones.

La conexión no quedó verificada: el SSID configurado `FLIA TORREZ_PLUS` apareció únicamente en 5745 MHz durante el escaneo del computador. `FLIA TORREZ_NORMAL` sí apareció en 2,4 GHz. Es necesario configurar el SSID de 2,4 GHz con su contraseña correspondiente y recompilar/cargar antes de repetir la prueba API desde la placa. No se presupone que ambas redes compartan contraseña.

### Repetición con red corregida

Con el SSID corregido, el ESP8266 recibió `192.168.1.11`. Se observaron tiempos de espera HTTP intermitentes en la primera prueba. Se desactivó el ahorro Wi-Fi durante el diagnóstico alimentado por USB y se amplió el timeout HTTP a 8 s. Se recompiló/cargó y verificó el hash de la carga.

Desde la placa se verificaron HTTP 200 en `obtener-configuracion` y `obtener-comando-pendiente`, configuración válida 60–80 % y máximo 60 s, y autenticación del dispositivo correcta. No se publicaron mediciones ni estado de bomba, y no se ejecutaron órdenes. Esta prueba confirma comunicación de lectura/autenticación; no demuestra todavía estabilidad prolongada, lectura del sensor ni control físico.

## Red abierta de presentación

Contraseña vacía es válida: el firmware usa WiFi.begin(SSID) y solo exige SSID. Se mantiene el diagnóstico sin ADC/relé. Si la contraseña está vacía y la API es HTTP, se bloquea la consulta para no transmitir credenciales sin cifrar en esa red. Este diagnóstico todavía no implementa cliente HTTPS con validación de certificado; cambiar solo la URL no completa la migración a Supabase.

La API local del computador debe estar accesible desde la misma LAN; la IP de casa puede cambiar en el lugar de presentación. Un portal cautivo o aislamiento entre clientes puede impedir acceso aunque el ESP obtenga IP. No se ha probado aún WiFi Unimagdalena desde la placa.

## Diagnóstico de asociación institucional

El ESP8266 encuentra el SSID configurado en canal 11, cifrado SDK 7 (abierta), RSSI de escaneo entre -58 y -60 dBm. El fallo observado es motivo SDK 203 (ASSOC_FAIL), y en otro intento 4 (ASSOC_EXPIRE), sin evento de asociación ni IP. El RSSI de estado sin conexión no es una medida válida; usar únicamente el resultado de escaneo para señal.

Se repitió con PHY 802.11g y reapareció 203. No se ha demostrado una política concreta del AP ni portal cautivo; el fallo ocurre antes de DHCP y no permite probar la API. Próxima comprobación: hotspot de 2,4 GHz conocido para comparar asociación; si conecta, consultar a soporte de la red institucional sobre acceso de dispositivos IoT. No se alteraron MAC ni políticas de acceso.

Una carga a 115200 falló por paquete inválido; se recuperó a 57600 y terminó con hash verificado. La configuración conserva 57600 para carga. El diagnóstico detallado, sin ADC ni relé, quedó cargado.

## Prueba independiente A0

Entorno `prueba_a0`, fuente `src/prueba_a0.cpp`: radio apagada, sin claves ni consultas API, sin GPIO de salida. Lee 16 muestras de A0 separadas 20 ms y muestra promedio/mínimo/máximo por serie. Compilar/cargar con `pio run -d firmware -e prueba_a0` y `pio run -d firmware -e prueba_a0 -t upload --upload-port /dev/ttyUSB0`.

Prueba física: carga verificada y arranque observado. Con el montaje declarado por el usuario como divisor desde 3V3, se observaron promedios 18.0–18.2/1023 tras estabilizarse. Es una lectura bruta, no humedad ni medida certificada de tensión. No concuerda con el divisor nominal; no se concluye el rango A0 ni se autoriza conexión directa. Revisar resistencias, contactos y alimentación con USB desconectado antes de seguir. El montaje no fue validado visualmente con detalle.

## Sensor hacia Supabase (entorno supabase_sensor)

`src/supabase_sensor.cpp` mantiene A0 y relé deshabilitado como salida (no se configura ningún GPIO de relé). Compilar: `pio run -d firmware -e supabase_sensor`. NO confundir con el diagnóstico de red o prueba_a0. Este entorno lee A0 y envía periódicamente; no detecta por sí mismo la inserción en tierra.

Credenciales cloud en `supabase.local.h` (ignorado, modo 0600), plantilla pública `supabase.example.h`. Se copia la publishable key existente pero no se reutiliza automáticamente el token de la API local. CLOUD_DEVICE_TOKEN debe coincidir con HIDROSMART_DEVICE_TOKEN del backend remoto; CLOUD_DEVICE_ID debe existir en la tabla dispositivos. Se comprueba obtener-estado antes de registrar-medicion y se bloquea ante errores. La comprobación HTTP realizada todavía devuelve DISPOSITIVO_NO_ENCONTRADO para esp8266-cultivo-01.

HTTPS con BearSSL y GTS Root R4 del almacén de confianza del sistema (raíz pública en supabase_ca.h); no se usa setInsecure. Debe obtener hora por NTP para validar certificados y fechar mediciones. Si falla Wi-Fi, NTP, TLS, autenticación o registro, no se declara éxito ni se inventan fechas. Una rotación de CA requerirá revisar/actualizar la raíz. La red universitaria todavía no completó asociación en los ensayos previos; el firmware no evade sus restricciones.

Mientras los extremos seco/húmedo de config.local.h no estén calibrados, envia tipo_lectura=relativa y valida=false; valor_original guarda el promedio ADC, y humedad contiene un índice eléctrico provisional inverso de escala ADC completa (100*(1023-raw)/1023), NO porcentaje de humedad del sustrato. Estos registros no deben usarse para riego ni presentarse como mediciones válidas. Después de calibrar se usa la transformación seco/húmedo. La interfaz actual filtra las mediciones inválidas y puede no mostrarlas como humedad actual.

Intervalo configurable HIDROSMART_MEASUREMENT_INTERVAL_MS, mínimo 10 s y por defecto 30 s. La fecha corresponde a la lectura tomada antes del envío. No se adjunta id de deduplicación porque su soporte remoto no está confirmado; ante respuesta perdida no se reenvía la misma medición. No hay cola persistente: si no conecta, los datos de ese periodo no se recuperan. No es todavía el controlador completo de riego ni una solución de historial offline.

### Verificación de token cloud configurado

Con CLOUD_DEVICE_TOKEN ya rellenado se envió un POST a registrar-medicion con cuerpo vacío, para comprobar autenticación sin insertar datos. Resultado HTTP 401 NO_AUTORIZADO, credencial de dispositivo inválida; no se alcanzó la validación del cuerpo (422 esperado con token correcto). No se mostró la credencial. Confirmar que el valor coincide con el secreto HIDROSMART_DEVICE_TOKEN del proyecto remoto. No se cargó el entorno supabase_sensor; la prueba A0 permanece en la placa. Se corrigió el cálculo con extremos de calibración iguales para evitar división por cero en el código compilado.
