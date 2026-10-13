import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  estimarAgua,
  evaluarRiego,
  generarSerieInicial,
  seedDecisiones,
  seedHistorialRiegos,
} from "../lib/irrigation";

const KEY = "hidrosmart-state-v1";

function loadPersist() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

const FarmContext = createContext(null);

export function FarmProvider({ children }) {
  const persisted = loadPersist();

  const [humedad, setHumedad] = useState(persisted?.humedad ?? 46.5);
  const [umbralMin, setUmbralMin] = useState(persisted?.umbralMin ?? 35);
  const [umbralMax, setUmbralMax] = useState(persisted?.umbralMax ?? 65);
  const [tiempoMaxRiego, setTiempoMaxRiego] = useState(persisted?.tiempoMaxRiego ?? 20);
  const [cantidadPlantas, setCantidadPlantas] = useState(persisted?.cantidadPlantas ?? 12);

  const [serie, setSerie] = useState(persisted?.serie ?? (() => generarSerieInicial()));
  const [riegos, setRiegos] = useState(persisted?.riegos ?? (() => seedHistorialRiegos()));
  const [decisiones, setDecisiones] = useState(persisted?.decisiones ?? (() => seedDecisiones()));

  const [riegoActivo, setRiegoActivo] = useState(false);
  const [minutosRegando, setMinutosRegando] = useState(0);
  const [simulando, setSimulando] = useState(true);
  const riegoInicioRef = useRef(null);

  // LLM settings
  const [apiKey, setApiKey] = useState(localStorage.getItem("hidrosmart-apikey") || "");
  const [endpoint, setEndpoint] = useState(localStorage.getItem("hidrosmart-endpoint") || "https://api.openai.com/v1/chat/completions");
  const [model, setModel] = useState(localStorage.getItem("hidrosmart-model") || "gpt-4o-mini");
  const [modoLLM, setModoLLM] = useState(localStorage.getItem("hidrosmart-modo") || "analisis"); // analisis | control
  const [chat, setChat] = useState([]);

  const pushDecision = useCallback((tipo, titulo, detalle) => {
    setDecisiones((d) => [...d.slice(-49), { id: crypto.randomUUID(), at: new Date().toISOString(), tipo, titulo, detalle }]);
  }, []);

  const iniciarRiego = useCallback((motivo, origen = "automático") => {
    if (riegoActivo) return;
    setRiegoActivo(true);
    setMinutosRegando(0);
    riegoInicioRef.current = new Date();
    pushDecision("riego", `Riego iniciado (${origen})`, motivo);
  }, [riegoActivo, pushDecision]);

  const detenerRiego = useCallback((motivo) => {
    if (!riegoActivo) return;
    const dur = Math.max(1, Math.round(minutosRegando));
    const agua = +estimarAgua({ minutos: dur, cantidadPlantas }).toFixed(1);
    setRiegos((r) => [...r, { id: crypto.randomUUID(), inicio: riegoInicioRef.current?.toISOString() || new Date().toISOString(), duracionMin: dur, aguaL: agua, motivo, origen: "automático" }]);
    pushDecision("riego", `Riego detenido (${dur} min · ${agua} L)`, motivo);
    setRiegoActivo(false);
    setMinutosRegando(0);
    riegoInicioRef.current = null;
  }, [riegoActivo, minutosRegando, cantidadPlantas, pushDecision]);

  // Simulación del sensor cada 3 s  (≈ 1 min virtual de riego / evaporación)
  useEffect(() => {
    if (!simulando) return;
    const id = setInterval(() => {
      setHumedad((h) => {
        let nh;
        if (riegoActivo) nh = h + 1.6 + Math.random() * 1.4;
        else nh = h - (0.5 + Math.random() * 0.9);
        nh = Math.max(8, Math.min(95, nh));
        return +nh.toFixed(1);
      });
      if (riegoActivo) setMinutosRegando((m) => m + 1);
      // punto de serie cada ~30 s
      setSerie((s) => {
        const last = s[s.length - 1];
        if (Date.now() - last.t < 30_000) return s;
        return [...s.slice(-71), { t: Date.now(), humedad }];
      });
    }, 3000);
    return () => clearInterval(id);
  }, [simulando, riegoActivo, humedad]);

  // Motor automático: evalúa reglas tras cada cambio de humedad
  useEffect(() => {
    const r = evaluarRiego({ humedad, umbralMin, umbralMax, riegoActivo, minutosRegando, tiempoMaxRiego });
    if (r.accion === "iniciar") iniciarRiego(r.razon);
    else if (r.accion === "detener") detenerRiego(r.razon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [humedad]);

  // Persistencia
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ humedad, umbralMin, umbralMax, tiempoMaxRiego, cantidadPlantas, serie: serie.slice(-72), riegos: riegos.slice(-30), decisiones: decisiones.slice(-50) }));
  }, [humedad, umbralMin, umbralMax, tiempoMaxRiego, cantidadPlantas, serie, riegos, decisiones]);

  useEffect(() => { localStorage.setItem("hidrosmart-apikey", apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem("hidrosmart-endpoint", endpoint); }, [endpoint]);
  useEffect(() => { localStorage.setItem("hidrosmart-model", model); }, [model]);
  useEffect(() => { localStorage.setItem("hidrosmart-modo", modoLLM); }, [modoLLM]);

  const aguaHoy = useMemo(() => +riegos.reduce((a, r) => a + (r.aguaL || 0), 0).toFixed(1), [riegos]);

  const aplicarAccionLLM = useCallback(({ umbralMin: nMin, umbralMax: nMax, tiempoMaxRiego: nT, cantidadPlantas: nP, justificacion }) => {
    const cambios = [];
    if (typeof nMin === "number") { setUmbralMin(Math.max(10, Math.min(80, nMin))); cambios.push(`mín ${nMin}%`); }
    if (typeof nMax === "number") { setUmbralMax(Math.max(20, Math.min(95, nMax))); cambios.push(`máx ${nMax}%`); }
    if (typeof nT === "number") { setTiempoMaxRiego(Math.max(2, Math.min(120, nT))); cambios.push(`t.máx ${nT} min`); }
    if (typeof nP === "number") { setCantidadPlantas(Math.max(1, Math.min(500, Math.round(nP)))); cambios.push(`${Math.round(nP)} plantas`); }
    pushDecision("llm", "LLM modificó configuración ⚠️", `${cambios.join(" · ") || "sin cambios"}. Justificación: ${justificacion || "—"}`);
  }, [pushDecision]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(KEY);
    setHumedad(46.5); setUmbralMin(35); setUmbralMax(65); setTiempoMaxRiego(20); setCantidadPlantas(12);
    setSerie(generarSerieInicial()); setRiegos(seedHistorialRiegos()); setDecisiones(seedDecisiones());
    setRiegoActivo(false); setMinutosRegando(0);
    pushDecision("info", "Demo reiniciada", "Valores de fábrica restaurados.");
  }, [pushDecision]);

  const value = {
    humedad, umbralMin, umbralMax, tiempoMaxRiego, cantidadPlantas,
    setUmbralMin, setUmbralMax, setTiempoMaxRiego, setCantidadPlantas,
    serie, riegos, decisiones, pushDecision,
    riegoActivo, minutosRegando, simulando, setSimulando,
    iniciarRiego, detenerRiego,
    aguaHoy, apiKey, setApiKey, endpoint, setEndpoint, model, setModel,
    modoLLM, setModoLLM, chat, setChat, aplicarAccionLLM, resetDemo,
  };
  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error("useFarm fuera del provider");
  return ctx;
}
