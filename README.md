# HidroSmart

Interfaz web de un prototipo de riego por goteo para una a tres plantas de pepino. La demostración permite consultar lecturas y riegos del día, simular el control manual, guardar ajustes en el navegador y conversar con HidroAI sobre los datos de ejemplo.

```bash
npm ci
npm run dev
npm run lint
npm run build
```

Si las dependencias ya están instaladas, ejecuta `npm run dev` directamente. En el selector **Escenario** puedes probar el panel sin conexión, sin datos o con un error de comunicación.

El [contrato REST](docs/HIDROSMART%20API.md) describe la integración con la API y el ESP8266. El motor de riego real y sus protecciones pertenecen al firmware. HidroAI usa Google Gemini para responder sobre los datos de demostración.

## Configurar HidroAI

Agrega estas variables a tu `.env` y reinicia Vite. Si ya tienes un `.env`, conserva los demás valores.

```dotenv
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

Rellena `GEMINI_API_KEY` con tu clave de Google AI Studio. `GEMINI_MODEL` es opcional y su valor predeterminado es `gemini-3.5-flash-lite`. La clave se utiliza en el servidor. Mantén el nombre sin el prefijo `VITE_`.

En desarrollo, `npm run dev` sirve el chat en `/asistente`. Para probar la compilación local, usa `npm run build` y `npm run preview`. En Vercel, agrega ambas variables en la configuración del entorno que vas a usar y vuelve a desplegar. La función `/api/hidroai/chat` usa la cuota del proyecto de Google, por lo que la prueba con tu clave debe hacerse en un despliegue con acceso restringido.

El chat envía a Gemini la pregunta, hasta ocho intercambios anteriores y los datos simulados de la prueba. La conversación vive en memoria mientras la pestaña está abierta y se limpia al recargar. El asistente explica datos y ajustes.
