import { useEffect, useRef, useState } from "react";
import {
  faKey,
  faPaperPlane,
  faShieldHalved,
  faTriangleExclamation,
  faCheck,
  faXmark,
  faWandMagicSparkles,
  faTrash,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";
import { Fa } from "../components/FaIcon";
import { useFarm } from "../context/FarmContext";
import { Card, SectionTitle } from "../components/Layout";
import { renderMarkdown } from "../lib/markdown";
import { useSpeech } from "../hooks/useSpeech";
import { buildSystemPrompt, buildUserContext, chatLLM, extractAction, stripActionBlock, analisisLocal, DEFAULT_ENDPOINT, DEFAULT_MODEL } from "../lib/llm";
import { estadoHumedad } from "../lib/irrigation";

const SUGERENCIAS = [
  "¿Cómo estuvo el riego de hoy?",
  "¿La humedad actual es buena para el pepino?",
  "¿Debo cambiar los umbrales?",
  "Resume las decisiones del día",
];

export default function Asistente() {
  const farm = useFarm();
  const { apiKey, setApiKey, endpoint, setEndpoint, model, setModel, modoLLM, setModoLLM, chat, setChat, aplicarAccionLLM, pushDecision } = farm;
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);
  const [mostrarConexion, setMostrarConexion] = useState(!apiKey);
  const bottomRef = useRef(null);
  const voz = useSpeech();

  // Auto-scroll: baja al final cada vez que llega un mensaje (propio o del LLM)
  // o cambia el estado de carga, incluyendo justo al enviar.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, cargando]);

  const resumen = () => {
    const { humedad, umbralMin, umbralMax, riegoActivo, minutosRegando, aguaHoy, riegos, decisiones } = farm;
    const est = estadoHumedad(humedad, umbralMin, umbralMax);
    return {
      humedad: humedad.toFixed(1), estado: est.etiqueta,
      riegoActivo, minutosRegando, aguaHoy,
      riegosHoy: riegos.length,
      ultimasDecisiones: decisiones.slice(-4).map((d) => d.titulo).join("; ") || "—",
    };
  };

  const enviar = async (texto) => {
    const pregunta = (texto ?? input).trim();
    if (!pregunta || cargando) return;
    voz.desbloquear(); // gesto del usuario: habilita la voz en iOS
    voz.detener(); // corta cualquier lectura en curso
    setInput("");
    setChat((c) => [...c, { rol: "user", texto: pregunta, at: new Date().toISOString() }]);
    setCargando(true);
    try {
      if (!apiKey) {
        // Fallback local
        await new Promise((r) => setTimeout(r, 700));
        const { humedad, umbralMin, umbralMax, riegoActivo, aguaHoy, riegos, cantidadPlantas, serie } = farm;
        const txt = analisisLocal({ humedad: humedad.toFixed(1), umbralMin, umbralMax, riegoActivo, aguaHoy, riegosHoy: riegos.length, cantidadPlantas, serie });
        setChat((c) => [...c, { rol: "assistant", texto: txt, at: new Date().toISOString(), local: true }]);
        voz.hablarSiAuto(txt);
      } else {
        const r = resumen();
        const sys = buildSystemPrompt({ modo: modoLLM, config: farm, resumen: r });
        const ctx = buildUserContext({ historialHumedad: farm.serie, historialRiegos: farm.riegos, decisiones: farm.decisiones });
        const messages = [
          { role: "system", content: sys },
          ...chat.slice(-8).flatMap((m) => [{ role: m.rol === "user" ? "user" : "assistant", content: m.texto }]),
          { role: "user", content: `${ctx}\n\nPregunta del agricultor: ${pregunta}` },
        ];
        const raw = await chatLLM({ endpoint, apiKey, model, messages });
        const action = modoLLM === "control" ? extractAction(raw) : null;
        const limpio = stripActionBlock(raw);
        setChat((c) => [...c, { rol: "assistant", texto: limpio, at: new Date().toISOString(), conAccion: !!action }]);
        voz.hablarSiAuto(limpio);
        if (action) setAccionPendiente(action);
      }
    } catch (e) {
      const msg = `😕 No pude contactar al LLM: ${e.message}. Revisa tu API key y endpoint. Mientras tanto puedo seguir con análisis local.`;
      setChat((c) => [...c, { rol: "assistant", texto: msg, at: new Date().toISOString(), error: true }]);
      voz.hablarSiAuto(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Selector de modo */}
      <Card className={modoLLM === "control" ? "border-red-300 !bg-red-50/60" : "!bg-leaf-50/60"}>
        <SectionTitle emoji={modoLLM === "control" ? "⚠️" : "🔒"} title={modoLLM === "control" ? "Modo control total (inseguro)" : "Modo análisis seguro"} sub={modoLLM === "control" ? "El LLM PUEDE cambiar umbrales, tiempos y plantas. Cada cambio pide tu confirmación." : "El LLM solo interpreta datos. No puede modificar nada del sistema."} />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setModoLLM("analisis"); pushDecision("llm", "Modo LLM: análisis seguro 🔒", "El asistente solo interpretará datos."); }} className={`rounded-2xl py-2.5 px-2 text-[12.5px] font-extrabold flex items-center justify-center gap-1.5 border-2 transition ${modoLLM === "analisis" ? "bg-leaf-400 border-leaf-500 text-leaf-900 shadow" : "bg-white border-gray-100 text-gray-400"}`}>
            <Fa icon={faShieldHalved} size={16} /> Solo analiza
          </button>
          <button onClick={() => { setModoLLM("control"); pushDecision("alerta", "Modo LLM: control total ⚠️", "El LLM podrá proponer cambios de configuración."); }} className={`rounded-2xl py-2.5 px-2 text-[12.5px] font-extrabold flex items-center justify-center gap-1.5 border-2 transition ${modoLLM === "control" ? "bg-red-500 border-red-600 text-white shadow" : "bg-white border-gray-100 text-gray-400"}`}>
            <Fa icon={faTriangleExclamation} size={16} /> Puede cambiar
          </button>
        </div>
      </Card>

      {/* Conexión */}
      <Card>
        <button onClick={() => setMostrarConexion(!mostrarConexion)} className="w-full flex items-center justify-between">
          <span className="font-display font-bold text-[14px] text-gray-800 flex items-center gap-1.5"><Fa icon={faKey} size={16} className="text-leaf-600" /> Conexión LLM {apiKey ? <span className="text-[10px] font-extrabold bg-leaf-400 text-leaf-900 px-2 py-0.5 rounded-full">CONECTADO</span> : <span className="text-[10px] font-extrabold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">MODO LOCAL</span>}</span>
          <span className="text-gray-400 font-black">{mostrarConexion ? "−" : "+"}</span>
        </button>
        {mostrarConexion && (
          <div className="flex flex-col gap-2 mt-3">
            <label className="text-[11px] font-extrabold text-gray-500 uppercase">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold outline-none focus:border-leaf-400 focus:ring-2 focus:ring-leaf-200" />
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-[11px] font-extrabold text-gray-500 uppercase">Endpoint (OpenAI-compatible)</label>
                <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder={DEFAULT_ENDPOINT} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-[12px] font-bold outline-none focus:border-leaf-400" />
              </div>
              <div>
                <label className="text-[11px] font-extrabold text-gray-500 uppercase">Modelo</label>
                <input value={model} onChange={(e) => setModel(e.target.value)} placeholder={DEFAULT_MODEL} className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-[12px] font-bold outline-none focus:border-leaf-400" />
              </div>
            </div>
            <p className="text-[11.5px] text-gray-500 font-medium leading-snug bg-leaf-50 rounded-2xl px-3 py-2 border border-leaf-100">Compatible con OpenAI, Groq, OpenRouter, Together o tu servidor local (Ollama/LM Studio). Sin key, el asistente usa análisis local integrado. Tu key se guarda solo en este teléfono.</p>
          </div>
        )}
      </Card>

      {/* Acción pendiente del LLM */}
      {accionPendiente && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 shadow">
          <p className="font-display font-bold text-[14px] text-amber-900">🤖 El LLM propone cambiar la configuración</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {accionPendiente.umbralMin != null && <span className="text-[11px] font-extrabold bg-white border border-amber-200 rounded-full px-2.5 py-1">mín → {accionPendiente.umbralMin}%</span>}
            {accionPendiente.umbralMax != null && <span className="text-[11px] font-extrabold bg-white border border-amber-200 rounded-full px-2.5 py-1">máx → {accionPendiente.umbralMax}%</span>}
            {accionPendiente.tiempoMaxRiego != null && <span className="text-[11px] font-extrabold bg-white border border-amber-200 rounded-full px-2.5 py-1">t.máx → {accionPendiente.tiempoMaxRiego} min</span>}
            {accionPendiente.cantidadPlantas != null && <span className="text-[11px] font-extrabold bg-white border border-amber-200 rounded-full px-2.5 py-1">plantas → {accionPendiente.cantidadPlantas}</span>}
          </div>
          {accionPendiente.justificacion && <p className="text-[12px] text-amber-800 font-medium mt-2 italic">“{accionPendiente.justificacion}”</p>}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => { aplicarAccionLLM(accionPendiente); setAccionPendiente(null); }} className="bg-leaf-500 text-white font-extrabold rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-[13px]"><Fa icon={faCheck} size={16} /> Aplicar</button>
            <button onClick={() => { setAccionPendiente(null); pushDecision("info", "Propuesta del LLM rechazada", "El usuario no autorizó el cambio."); }} className="bg-white border border-gray-200 text-gray-600 font-extrabold rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-[13px]"><Fa icon={faXmark} size={16} /> Rechazar</button>
          </div>
        </div>
      )}

      {/* Chat */}
      <Card className="!p-3">
        <SectionTitle emoji="🌱" title="HidroSmart AI" sub={apiKey ? `Modelo ${model} · modo ${modoLLM}` : "Análisis local · agrega tu key para potenciarlo"} right={
          <div className="flex items-center gap-1.5">
            {voz.soportado && (
              <button
                onClick={() => { voz.desbloquear(); if (voz.hablando) voz.detener(); voz.setAutoVoz(!voz.autoVoz); }}
                title={voz.autoVoz ? "Silenciar voz del bot" : "Activar voz del bot"}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${voz.autoVoz ? "bg-leaf-400 text-leaf-900 shadow" : "bg-gray-100 text-gray-400"}`}
              >
                <Fa icon={voz.autoVoz ? faVolumeHigh : faVolumeXmark} size={15} />
              </button>
            )}
            {chat.length > 0 && <button onClick={() => { voz.detener(); setChat([]); }} className="w-8 h-8 rounded-xl bg-gray-100 text-gray-400 hover:text-red-500 flex items-center justify-center transition"><Fa icon={faTrash} size={15} /></button>}
          </div>
        } />
        <div className="flex flex-col gap-2 max-h-[46vh] overflow-y-auto pr-0.5 min-h-[180px]">
          {chat.length === 0 && (
            <div className="text-center py-4">
              <p className="text-4xl mb-2">🥒</p>
              <p className="font-display font-bold text-gray-700 text-[14px]">¡Hola! Soy tu agrónomo digital</p>
              <p className="text-[12.5px] text-gray-500 font-medium mt-1">Pregúntame sobre riegos, humedad o decisiones del día.</p>
              <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                {SUGERENCIAS.map((s) => (
                  <button key={s} onClick={() => enviar(s)} className="text-[11.5px] font-bold bg-leaf-100 text-leaf-800 px-3 py-1.5 rounded-full border border-leaf-200 hover:bg-leaf-200 transition">{s}</button>
                ))}
              </div>
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] font-medium leading-relaxed ${m.rol === "user" ? "self-end bg-leaf-900 text-white rounded-br-md whitespace-pre-wrap" : m.error ? "self-start bg-red-50 border border-red-200 text-red-800 rounded-bl-md" : "self-start bg-leaf-50 border border-leaf-100 text-gray-700 rounded-bl-md"}`}>
              {m.local && <span className="block text-[10px] font-extrabold text-leaf-600 uppercase mb-1 flex items-center gap-1"><Fa icon={faWandMagicSparkles} size={11} /> Análisis local</span>}
              {m.rol === "user" ? m.texto : renderMarkdown(m.texto)}
              {m.rol !== "user" && voz.soportado && (
                <button
                  onClick={() => { voz.desbloquear(); if (voz.hablando) voz.detener(); else voz.hablar(m.texto); }}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[10.5px] font-extrabold text-leaf-700 bg-white border border-leaf-200 rounded-full px-2.5 py-1 hover:bg-leaf-100 transition"
                >
                  <Fa icon={faVolumeHigh} size={11} /> {voz.hablando ? "Detener" : "Escuchar"}
                </button>
              )}
              <span className="block text-[9.5px] font-bold opacity-50 mt-1">{new Date(m.at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
          {cargando && <div className="self-start bg-leaf-50 border border-leaf-100 rounded-2xl px-4 py-3 text-[13px] font-bold text-leaf-700 animate-pulse">🌱 Analizando el cultivo…</div>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex gap-2 mt-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ej. ¿Por qué se regó a las 6am?" className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-[13.5px] font-semibold outline-none focus:border-leaf-400 focus:ring-2 focus:ring-leaf-200 min-w-0" />
          <button type="submit" disabled={cargando || !input.trim()} className="w-12 h-12 shrink-0 rounded-2xl bg-leaf-400 hover:bg-leaf-500 disabled:opacity-40 text-leaf-900 flex items-center justify-center shadow transition active:scale-95">
            <Fa icon={faPaperPlane} size={19} />
          </button>
        </form>
      </Card>
    </div>
  );
}
