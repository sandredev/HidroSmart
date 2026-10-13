/* Cliente LLM compatible OpenAI + prompts del sistema HidroSmart */

export const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
export const DEFAULT_MODEL = "gpt-4o-mini";

export function buildSystemPrompt({ modo, config, resumen }) {
  const base = `Eres HidroSmart, el agrónomo digital de un sistema IoT de riego automático para pepino (Cucumis sativus, etapa floración/fructificación).
Hablas español claro, amable y profesional. Usas emojis con moderación 🌱.
Datos actuales del sistema:
- Humedad del suelo: ${resumen.humedad}%
- Estado: ${resumen.estado}
- Umbrales: min ${config.umbralMin}% / máx ${config.umbralMax}%
- Tiempo máximo de riego: ${config.tiempoMaxRiego} min
- Plantas: ${config.cantidadPlantas}
- Riego activo: ${resumen.riegoActivo ? `SÍ (${resumen.minutosRegando} min)` : "NO"}
- Agua usada hoy: ${resumen.aguaHoy} L en ${resumen.riegosHoy} riegos
- Últimas decisiones: ${resumen.ultimasDecisiones}
Explica siempre con base en estos datos. Si el usuario pregunta algo fuera del sistema, responde igual de forma útil pero recordando tu rol.`;

  if (modo === "control") {
    return (
      base +
      `\n\nMODO CONTROL TOTAL (INSEGURO) ACTIVADO ⚠️: tienes permiso para proponer cambios de configuración. Cuando consideres necesario cambiar umbrales, tiempo máximo o cantidad de plantas, incluye AL FINAL de tu respuesta un bloque JSON dentro de triple backtick con la etiqueta action, por ejemplo:\n\`\`\`action\n{"type":"update_config","umbralMin":38,"umbralMax":68,"tiempoMaxRiego":18,"justificacion":"..."}\n\`\`\`\nSolo incluye campos que quieras cambiar. La app pedirá confirmación al usuario antes de aplicar. Advierte siempre del riesgo de este modo.`
    );
  }
  return (
    base +
    `\n\nMODO ANÁLISIS SEGURO 🔒: SOLO analizas e interpretas datos. Está PROHIBIDO proponer o ejecutar cambios de configuración. Si el usuario pide cambiar algo, explícale que active el modo control bajo su responsabilidad y sugiere qué valor sería razonable sin aplicarlo.`
  );
}

export function buildUserContext({ historialHumedad, historialRiegos, decisiones }) {
  const ultimas = historialHumedad.slice(-12).map((p) => {
    const d = new Date(p.t);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}→${p.humedad}%`;
  });
  return `Serie humedad (últimas 6h, cada 30min): ${ultimas.join(", ")}.
Riegos de hoy: ${historialRiegos.map((r) => `${new Date(r.inicio).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })} (${r.duracionMin} min, ${r.aguaL} L) — ${r.motivo}`).join(" | ") || "sin riegos"}.
Decisiones: ${decisiones.slice(-6).map((d) => d.titulo).join(" | ")}.`;
}

/** Extrae bloque ```action {json} de la respuesta del LLM */
export function extractAction(text) {
  if (!text) return null;
  const m = text.match(/```action\s*([\s\S]*?)```/i);
  if (!m) return null;
  try {
    const json = JSON.parse(m[1].trim());
    if (json && json.type === "update_config") return json;
    return null;
  } catch {
    return null;
  }
}

/** Limpia el bloque action para mostrar al usuario */
export function stripActionBlock(text) {
  return (text || "").replace(/```action[\s\S]*?```/gi, "").trim();
}

/** Extrae solo el campo "message" de un cuerpo de error (JSON o texto).
    Formas soportadas: {error:{message}} (OpenAI/Gemini/Groq/OpenRouter),
    {message} o {detail} (otros proveedores). Nunca devuelve JSON crudo. */
export function parseErrorMessage(text, status) {
  if (!text || !String(text).trim()) {
    return status ? `El proveedor devolvió el error ${status} sin detalle.` : "El proveedor no devolvió detalle del error.";
  }
  try {
    const data = JSON.parse(text);
    const msg = data?.error?.message ?? data?.message ?? data?.detail;
    if (Array.isArray(msg)) {
      const joined = msg.map((m) => (typeof m === "string" ? m : m?.message || JSON.stringify(m))).join(" ").trim();
      if (joined) return joined.slice(0, 300);
    } else if (typeof msg === "string" && msg.trim()) {
      return msg.trim().slice(0, 300);
    }
  } catch {
    // No era JSON: sigue al fallback de texto plano
  }
  const plain = String(text).trim();
  if (/^\s*</.test(plain)) {
    return `El proveedor devolvió un error${status ? ` ${status}` : ""} (respuesta no JSON). Revisa endpoint y modelo.`;
  }
  return plain.slice(0, 300);
}

export async function chatLLM({ endpoint, apiKey, model, messages }) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 800 }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(parseErrorMessage(t, res.status));
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "(sin respuesta)";
}

/** Análisis local de respaldo cuando no hay API key */
export function analisisLocal({ humedad, umbralMin, umbralMax, riegoActivo, aguaHoy, riegosHoy, cantidadPlantas, serie }) {
  const caida = serie.length > 4 ? (serie[serie.length - 1].humedad - serie[serie.length - 5].humedad).toFixed(1) : "0";
  let diagnostico = "";
  if (humedad < umbralMin) diagnostico = `La humedad (${humedad}%) está por debajo del mínimo (${umbralMin}%). Es correcto que el sistema haya activado o vaya a activar riego: el pepino en floración aborta flores con estrés hídrico.`;
  else if (humedad > umbralMax) diagnostico = `La humedad (${humedad}%) supera el máximo (${umbralMax}%). Bien detenido el riego: el encharcamiento favorece pudrición radicular y mildiu, enemigos del pepino.`;
  else diagnostico = `La humedad (${humedad}%) está en rango óptimo (${umbralMin}–${umbralMax}%). El cultivo está confortable.`;

  return `🌱 **Análisis local HidroSmart** (sin LLM — agrega tu API key para análisis avanzado)\n\n${diagnostico}\n\n- 💧 Agua hoy: ${aguaHoy} L en ${riegosHoy} riegos para ${cantidadPlantas} plantas (~${riegosHoy ? (aguaHoy / cantidadPlantas).toFixed(2) : "0"} L/planta).\n- 📉 Tendencia 2h: ${caida}% ${parseFloat(caida) < -2 ? "(caída rápida — calor/evaporación)" : "(estable)"}.\n- 🚿 Riego: ${riegoActivo ? "ACTIVO — supervisando límite de seguridad." : "inactivo — vigilancia normal."}\n\nSugerencia: mantén ciclos cortos y frecuentes (goteo), típico del pepino, y revisa el drenaje si la humedad supera 70% con frecuencia.`;
}
