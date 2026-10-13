# 🥒 HidroSmart — Riego automático inteligente para pepino

Plataforma web **mobile-first** para monitorear y analizar un sistema IoT de riego automático en cultivo de pepino. Incluye asistente LLM con dos modos de operación.

## Stack
- **React + Vite + React Router** · **TailwindCSS v4** · **Recharts** · **Lucide**
- Fuentes amigables y profesionales: **Nunito + Quicksand** · Color principal **verde claro** (`#4ade80`)

## Funcionalidades (mapeadas a tus requisitos)
| Requisito | Dónde |
|---|---|
| Humedad actual del suelo | Inicio → gauge + barra con umbrales |
| Historial de riegos | Pestaña Día → Riegos (gráfica + lista, motivo, L y min) |
| Umbrales de humedad | Ajustes → sliders mín/máx + validación |
| Tiempo máximo de riego | Ajustes + motor de seguridad que corta el riego |
| Cantidad de plantas | Ajustes → estimación de litros por riego |
| Decisiones del día | Inicio + Día → timeline con hora, tipo y justificación |
| LLM con API key, 2 modos | Asistente → modo **Solo analiza 🔒** (seguro) y **Control total ⚠️** (inseguro, propone JSON `action` que el usuario aprueba/rechaza) |

## Modos del LLM
- **🔒 Solo análisis (seguro, por defecto):** el prompt del sistema le prohíbe cambiar configuración. Solo interpreta datos.
- **⚠️ Control total (inseguro):** el prompt le permite emitir un bloque ````action {"type":"update_config",...}````. La app lo detecta, muestra tarjeta de confirmación y registra la decisión como `LLM`. Úsalo solo para demostración.

Compatible con cualquier endpoint **OpenAI-compatible** (OpenAI, Groq, OpenRouter, Together, Ollama local). Sin key funciona con **análisis local integrado**.

## Cómo correr
```bash
npm install
npm run dev   # → http://localhost:5173
```

## Estructura
```
src/
  context/FarmContext.jsx  # estado global + simulación sensor + motor de riego + persistencia
  lib/irrigation.js        # reglas agronómicas pepino, estimaciones, seeds demo
  lib/llm.js               # prompts, cliente OpenAI-compatible, parser de acciones
  pages/Dashboard.jsx      # humedad, stats, gráfica, decisiones recientes
  pages/Historial.jsx      # timeline del día, riegos, curva 24h, export CSV
  pages/Asistente.jsx      # chat LLM + conexión + modos + aprobación de cambios
  pages/Config.jsx         # umbrales, t. máx, plantas, cultivo, reset
  components/              # Header, BottomNav, MoistureGauge
```

## Notas de diseño
- Mobile-first: contenedor `max-w-md`, bottom-nav con 4 pestañas, tarjetas `rounded-3xl`, termijnos grandes táctiles.
- Simulación: el sensor virtual deriva cada 3 s; el motor `evaluarRiego()` inicia/detiene y registra cada decisión con su razón agronómica.
