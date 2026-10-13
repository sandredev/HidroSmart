/* Utilidades de voz (TTS) para HidroSmart.
   Usa la Web Speech API del navegador: sin costo, sin API key, sin dependencias. */

export function soportaVoz() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Elige la mejor voz en español disponible en el dispositivo. */
export function elegirVoz(voces = []) {
  if (!voces || voces.length === 0) return null;
  const prefs = ["es-MX", "es-ES", "es-US"];
  for (const p of prefs) {
    const v = voces.find((v) => (v.lang || "").toLowerCase().startsWith(p.toLowerCase()));
    if (v) return v;
  }
  const anyEs = voces.find((v) => (v.lang || "").toLowerCase().startsWith("es"));
  if (anyEs) return anyEs;
  return voces.find((v) => v.default) || voces[0] || null;
}

/** Convierte la respuesta Markdown del chatbot en texto plano legible en voz alta:
    quita bloques action/código, símbolos ** # `, enlaces y viñetas. */
export function textoParaVoz(markdown) {
  let t = String(markdown || "");
  t = t.replace(/```action[\s\S]*?```/gi, " ");
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/^#{1,4}\s+/gm, "");
  t = t.replace(/^>\s?/gm, "");
  t = t.replace(/^\s*([-*•]|\d+[.)])\s+/gm, "");
  t = t.replace(/(\*\*|__)(.*?)\1/g, "$2");
  t = t.replace(/(^|\W)(\*|_)([^*_]+)\2/g, "$1$3");
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t.slice(0, 900);
}
