import { useCallback, useEffect, useRef, useState } from "react";
import { elegirVoz, textoParaVoz } from "../lib/speech";

const KEY = "hidrosmart-autovoz";

/** Voz del bot (TTS) con Web Speech API.
    - hablar(texto): lee una respuesta (troceada por frases).
    - hablarSiAuto(texto): la lee solo si el modo automático está activo.
    - detener(): corta la lectura. desbloquear(): gesto para iOS. */
export function useSpeech() {
  const synth = typeof window !== "undefined" && "speechSynthesis" in window
    ? window.speechSynthesis
    : null;

  const [soportado] = useState(!!synth);
  const [hablando, setHablando] = useState(false);
  const [autoVoz, setAutoVoz] = useState(() => {
    try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
  });
  const autoRef = useRef(autoVoz);
  autoRef.current = autoVoz;
  const vozRef = useRef(null);

  // Las voces llegan tarde en Chrome: se cargan de forma diferida.
  useEffect(() => {
    if (!synth) return;
    const cargar = () => {
      const v = elegirVoz(synth.getVoices());
      if (v) vozRef.current = v;
    };
    cargar();
    synth.onvoiceschanged = cargar;
    return () => { synth.onvoiceschanged = null; };
  }, [synth]);

  useEffect(() => {
    try { localStorage.setItem(KEY, autoVoz ? "on" : "off"); } catch {}
  }, [autoVoz]);

  useEffect(() => () => { try { synth?.cancel(); } catch {} }, [synth]);

  const detener = useCallback(() => {
    try { synth?.cancel(); } catch {}
    setHablando(false);
  }, [synth]);

  const desbloquear = useCallback(() => {
    // iOS exige un gesto del usuario: llamar desde el click (enviar/toggle).
    try { synth?.resume(); } catch {}
  }, [synth]);

  const hablar = useCallback((markdown) => {
    if (!synth) return;
    try {
      synth.cancel();
      const texto = textoParaVoz(markdown);
      if (!texto) return;
      // Trocea por frases (~220 caracteres): evita el corte de Chrome
      // en lecturas largas y da pausas más naturales.
      const frases = texto.match(/[^.!?;:\n]+[.!?;:\n]?/g)?.map((s) => s.trim()).filter(Boolean) || [texto];
      const grupos = [];
      let acc = "";
      for (const f of frases) {
        if ((acc + " " + f).length > 220) { grupos.push(acc); acc = f; }
        else acc = acc ? `${acc} ${f}` : f;
      }
      if (acc) grupos.push(acc);
      grupos.slice(0, 6).forEach((g, idx, arr) => {
        const u = new SpeechSynthesisUtterance(g);
        u.lang = "es-ES";
        if (vozRef.current) u.voice = vozRef.current;
        u.rate = 1;
        u.pitch = 1;
        if (idx === 0) u.onstart = () => setHablando(true);
        if (idx === arr.length - 1) {
          u.onend = () => setHablando(false);
          u.onerror = () => setHablando(false);
        }
        synth.speak(u);
      });
    } catch {
      setHablando(false);
    }
  }, [synth]);

  const hablarSiAuto = useCallback((markdown) => {
    if (autoRef.current) hablar(markdown);
  }, [hablar]);

  return { soportado, hablando, autoVoz, setAutoVoz, hablar, hablarSiAuto, detener, desbloquear };
}
