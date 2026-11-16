# HidroSmart

Interfaz web de un prototipo de riego por goteo para una a tres plantas de pepino. La demostración permite consultar lecturas y riegos del día, simular el control manual, guardar ajustes en el navegador y probar consultas de HidroAI con datos de ejemplo.

```bash
npm ci
npm run dev
npm run lint
npm run build
```

Si las dependencias ya están instaladas, ejecuta `npm run dev` directamente. En el selector **Escenario** puedes probar el panel sin conexión, sin datos o con un error de comunicación.

El [contrato REST](docs/HIDROSMART%20API.md) describe la integración con la API y el ESP8266. El motor de riego real y sus protecciones pertenecen al firmware. HidroAI usará Google Gemini durante las pruebas de integración.
