import { Link } from "react-router-dom";
import {
  faDroplet,
  faLeaf,
  faStopwatch,
  faBell,
  faChevronRight,
  faRobot,
  faPowerOff,
} from "@fortawesome/free-solid-svg-icons";
import { Fa } from "../components/FaIcon";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useFarm } from "../context/FarmContext";
import { Card, SectionTitle } from "../components/Layout";
import { MoistureGauge } from "../components/MoistureGauge";

function Stat({ icon, label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl p-3 border ${accent} flex-1 min-w-0`}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide opacity-70">{icon}{label}</div>
      <div className="font-display font-bold text-xl leading-tight mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[11px] font-semibold opacity-70 truncate">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { serie, riegos, decisiones, cantidadPlantas, tiempoMaxRiego, umbralMin, umbralMax, aguaHoy, riegoActivo, minutosRegando, iniciarRiego, detenerRiego, humedad, modoLLM } = useFarm();

  const data = serie.slice(-24).map((p) => ({ ...p, hora: new Date(p.t).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) }));
  const ultimas = [...decisiones].slice(-3).reverse();

  return (
    <div className="flex flex-col gap-3 sm:gap-4 pb-2">
      {modoLLM === "control" && (
        <div className="bg-red-500 text-white rounded-2xl px-3.5 py-2.5 text-[12px] font-bold shadow flex gap-2 items-start">
          <span className="text-base">⚠️</span>
          <span>Modo <b>CONTROL TOTAL</b> activo: el LLM puede cambiar umbrales y tiempos. Úsalo solo para pruebas. <Link to="/asistente" className="underline">Revisar →</Link></span>
        </div>
      )}

      {/* Stats: 2 col móvil · 4 col tablet/desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Stat icon={<Fa icon={faLeaf} size={12} />} label="Plantas" value={`🥒 ${cantidadPlantas}`} sub="pepino · floración" accent="bg-leaf-100 border-leaf-200 text-leaf-900" />
        <Stat icon={<Fa icon={faDroplet} size={12} />} label="Agua hoy" value={`${aguaHoy} L`} sub={`${riegos.length} riegos`} accent="bg-sky-50 border-sky-100 text-sky-900" />
        <Stat icon={<Fa icon={faStopwatch} size={12} />} label="T. máx riego" value={`${tiempoMaxRiego} min`} sub={riegoActivo ? `regando ${minutosRegando} min` : "límite seguridad"} accent="bg-amber-50 border-amber-100 text-amber-900" />
        <Stat icon={<Fa icon={faBell} size={12} />} label="Umbrales" value={`${umbralMin}–${umbralMax}%`} sub="min – máx" accent="bg-violet-50 border-violet-100 text-violet-900" />
      </div>

      {/* Contenido: 1 col móvil · 2 col desktop */}
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-5 items-start">
        <div className="flex flex-col gap-3 sm:gap-4 xl:col-span-2">
          <MoistureGauge />
          <Card>
            <div className="flex flex-col sm:flex-row xl:flex-col gap-2">
              {!riegoActivo ? (
                <button onClick={() => iniciarRiego(`Riego manual desde la app. Humedad ${humedad}%`, "manual")} className="flex-1 bg-leaf-400 hover:bg-leaf-500 active:scale-[0.98] text-leaf-900 font-extrabold rounded-2xl py-3 flex items-center justify-center gap-2 shadow transition">
                  <Fa icon={faPowerOff} size={18} /> Regar ahora
                </button>
              ) : (
                <button onClick={() => detenerRiego("Detenido manualmente desde la app.")} className="flex-1 bg-gray-800 hover:bg-gray-900 active:scale-[0.98] text-white font-extrabold rounded-2xl py-3 flex items-center justify-center gap-2 shadow transition">
                  <Fa icon={faPowerOff} size={18} /> Detener riego
                </button>
              )}
              <Link to="/asistente" className="flex-1 bg-leaf-900 hover:bg-black active:scale-[0.98] text-white font-extrabold rounded-2xl py-3 flex items-center justify-center gap-2 shadow transition">
                <Fa icon={faRobot} size={18} /> Preguntar al LLM
              </Link>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4 xl:col-span-3">
          <Card>
            <SectionTitle emoji="📈" title="Humedad últimas horas" sub="Cada punto ≈ 30 min · banda verde = rango óptimo" right={<Link to="/historial" className="text-[12px] font-extrabold text-leaf-600 flex items-center">Ver día <Fa icon={faChevronRight} size={14} /></Link>} />
            <div className="h-44 sm:h-56 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ left: -18, right: 8, top: 4, bottom: 0 }}>
                  <XAxis dataKey="hora" tick={{ fontSize: 9, fontWeight: 700 }} interval={5} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12, fontWeight: 700 }} formatter={(v) => [`${v}%`, "Humedad"]} />
                  <Area type="monotone" dataKey="humedad" stroke="#16a34a" strokeWidth={2.5} fill="#86efac" fillOpacity={0.45} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionTitle emoji="🧠" title="Decisiones de hoy" sub="Qué hizo el sistema y por qué" right={<Link to="/historial" className="text-[12px] font-extrabold text-leaf-600 flex items-center">Todas <Fa icon={faChevronRight} size={14} /></Link>} />
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {ultimas.map((d) => (
                <div key={d.id} className="flex gap-2.5 items-start bg-leaf-50 border border-leaf-100 rounded-2xl px-3 py-2.5">
                  <span className="text-lg leading-none mt-0.5">{d.tipo === "riego" ? "💧" : d.tipo === "alerta" ? "⚠️" : d.tipo === "llm" ? "🤖" : "ℹ️"}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-gray-800 leading-tight">{d.titulo}</p>
                    <p className="text-[12px] text-gray-500 font-medium leading-snug line-clamp-2">{d.detalle}</p>
                    <p className="text-[10.5px] font-bold text-gray-400 mt-0.5">{new Date(d.at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
