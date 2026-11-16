# Especificación: interfaz web de HidroSmart

## Objetivo

Crear desde cero una interfaz web adaptable para que una persona supervise y controle un prototipo de riego de una a tres plantas de pepino. El ESP8266 controla la bomba y conserva sus protecciones localmente. Esta etapa diseña la experiencia con datos de demostración identificados; la integración real se realizará después de concretar el contrato de API.

## Alcance y criterios de aceptación

- **Inicio:** presentar humedad disponible, fecha de la última lectura, estado conocido de la bomba y conexión, y resumen del día. Diferenciar datos antiguos o desconocidos de datos actuales.
- **Riego manual:** ofrecer acciones de inicio y parada. Durante esta etapa solo ilustran el flujo con datos de demostración; no deben afirmar que se ha accionado una bomba real. La integración posterior deberá mostrar el estado de solicitud y la confirmación del dispositivo.
- **Historial:** mostrar los riegos del día, con sus horas, duración y motivo cuando estén disponibles. Diferenciar valores estimados de medidos y contemplar ausencia de datos y riegos abiertos.
- **Configuración:** permitir editar los umbrales, el tiempo máximo y la cantidad de plantas (entero de una a tres). Guardar esos ajustes en el navegador durante la demostración. Una vez integrada, la API conservará la configuración compartida y el ESP8266 indicará qué versión ha aplicado. El conteo identifica la prueba y no cambia por sí solo las reglas de riego ni crea sensores independientes.
- **Asistente:** mostrar el espacio de consulta con respuestas de ejemplo basadas en los datos visibles. Usar Google Gemini en la integración de prueba. Cualquier propuesta futura de cambios requiere aprobación. No fingir conexión al modelo.
- **Estados:** contemplar carga, ausencia de información, error de comunicación, datos antiguos y dispositivo desconectado o desconocido. El funcionamiento local sin internet es responsabilidad del dispositivo, no de la interfaz.
- **Accesibilidad y adaptación:** navegación por teclado, foco visible, etiquetas accesibles, contraste legible y diseño para móvil y escritorio.
- **Demostración:** señalar los datos simulados de forma visible. No enviar órdenes reales ni guardar secretos en el navegador durante esta etapa.

## Dirección visual propuesta

El [sistema visual](DESIGN.md) toma la forma de un cuaderno de cultivo. La interfaz prioriza la lectura del sensor, su evolución durante el día y el control de la bomba.

## Tecnología y estructura

Partir del proyecto React y Vite existente, sustituyendo la maqueta gradualmente por una implementación nueva. Separar componentes de presentación, pantallas y una fuente de datos de demostración, de modo que pueda reemplazarse por un cliente de API. Evitar dependencias nuevas salvo que aporten valor concreto.

```text
src/                 Código de la aplicación
src/components/      Componentes compartidos de interfaz
src/pages/           Pantallas y flujos
src/lib/             Funciones compartidas y acceso a datos
docs/                Contrato y documentación de integración
```

## Comandos

- Desarrollo: `npm run dev`
- Compilación: `npm run build`
- Análisis estático: `npm run lint`
- Vista previa de compilación: `npm run preview`

## Estilo y verificación

Usar componentes pequeños con nombres descriptivos, datos explícitos y separación entre presentación y operaciones. Por ejemplo:

```jsx
function EstadoBomba({ activa }) {
  return <span>{activa ? "Riego activo" : "Riego detenido"}</span>;
}
```

Verificar compilación y análisis estático, y revisar visualmente las pantallas en tamaños de móvil y escritorio cuando el entorno lo permita. Comprobar los flujos de navegación, formularios y estados vacíos o de error; añadir pruebas automatizadas cuando protejan comportamiento significativo.

## Límites

- Siempre: distinguir simulación y datos reales, conservar el contrato existente hasta su revisión, y respetar las protecciones del dispositivo.
- Nunca: exponer secretos en el cliente, presentar una orden como ejecutada sin confirmación o inventar mediciones reales.
- Los detalles de API, calibración y sincronización se resolverán en la etapa de integración; no bloquean el diseño de la interfaz.

## Preguntas abiertas

- Probar en el sustrato los umbrales de partida, la calibración del sensor y la duración según el caudal real. El diseño usa una escala relativa de 0 a 100 y valores de demostración.
- Acordar con la implementación del dispositivo la cadencia de consulta y las confirmaciones de órdenes y configuración.
