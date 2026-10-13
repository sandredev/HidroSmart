import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { Fa } from "../components/FaIcon";
import { useFarm } from "../context/FarmContext";
import { Card, SectionTitle } from "../components/Layout";

export default function Historial() {
  const { riegos, serie, decisiones, aguaHoy } = useFarm();
  const [tab, setTab] = useState("decisiones"); // decisiones | riegos | humedad
  const [filtro, setFiltro] = useState("todas");

  const timeline = useMemo(() => {
    const list = [...decisiones].reverse();
    if (filtro === "todas") return list;
    return list.filter((d) => d.tipo === filtro);
  }, [decisiones, filtro]);

  const humData = serie.map((p) => ({ ...p, hora: new Date(p.t).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) }));
  const riegoData = riegos.map((r) => ({ hora: new Date(r.inicio).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }), litros: r.aguaL, min: r.duracionMin }));

  const exportCSV = () => {
    const rows = ["tipo,fecha,titulo,detalle", ...decisiones.map((d) => `${d.tipo},${d.at},"${d.titulo}","${(d.detalle || "").replace(/"/g, "'")}"`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hidrosmart-decisiones.csv";
    a.click();
  };

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <SectionTitle emoji="📅" title="El día del sistema" sub={`${riegos.length} riegos · ${aguaHoy} L · ${decisiones.length} decisiones registradas`} right={
          <button onClick={exportCSV} className="text-[11px] font-extrabold bg-leaf-100 text-leaf-800 px-2.5 py-1.5 rounded-xl flex items-center gap-1"><Fa icon={faDownload} size={13} /> CSV</button>
        } />
        <div className="grid grid-cols-3 bg-leaf-50 border border-leaf-100 rounded-2xl p-1 gap-1">
          {[["decisiones", "🧠 Decisiones"], ["riegos", "💧 Riegos"], ["humedad", "📈 Humedad"]].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`text-[12px] font-extrabold rounded-xl py-2 transition ${tab === k ? "bg-leaf-400 text-leaf-900 shadow" : "text-gray-500"}`}>{label}</button>
          ))}
        </div>
      </Card>

      {tab === "decisiones" && (
        <Card>
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {[["todas", "Todas"], ["riego", "💧 Riego"], ["alerta", "⚠️ Alertas"], ["info", "ℹ️ Info"], ["llm", "🤖 LLM"]].map(([k, l]) => (
              <button key={k} onClick={() => setFiltro(k)} className={`shrink-0 text-[11px] font-extrabold px-3 py-1.5 rounded-full border transition ${filtro === k ? "bg-leaf-900 text-white border-leaf-900" : "bg-white text-gray-500 border-gray-200"}`}>{l}</button>
            ))}
          </div>
          <div className="relative flex flex-col gap-0">
            {timeline.map((d, i) => (
              <div key={d.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-9 h-9 rounded-2xl bg-leaf-100 border border-leaf-200 flex items-center justify-center text-lg shrink-0">
                    {d.tipo === "riego" ? "💧" : d.tipo === "alerta" ? "⚠️" : d.tipo === "llm" ? "🤖" : "ℹ️"}
                  </span>
                  {i < timeline.length - 1 && <span className="w-0.5 flex-1 bg-leaf-200 my-1 rounded" />}
                </div>
                <div className="pb-4 min-w-0 flex-1">
                  <p className="text-[10.5px] font-extrabold text-leaf-700 uppercase tracking-wide">{new Date(d.at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })} · {new Date(d.at).toLocaleDateString("es", { day: "numeric", month: "short" })}</p>
                  <p className="text-[13.5px] font-extrabold text-gray-800 leading-tight">{d.titulo}</p>
                  <p className="text-[12.5px] text-gray-500 font-medium leading-snug mt-0.5">{d.detalle}</p>
                </div>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-center text-[13px] font-bold text-gray-400 py-6">Sin decisiones con este filtro 🌱</p>}
          </div>
        </Card>
      )}

      {tab === "riegos" && (
        <Card>
          <SectionTitle emoji="💧" title="Historial de riegos" sub="Duración, volumen y motivo de cada ciclo" />
          <div className="h-44 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riegoData} margin={{ left: -14, right: 8 }}>
                <XAxis dataKey="hora" tick={{ fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12, fontWeight: 700 }} formatter={(v, n) => n === "litros" ? [`${v} L`, "Agua"] : [`${v} min`, "Duración"]} />
                <Bar dataKey="litros" fill="#4ade80" radius={[8, 8, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2">
            {[...riegos].reverse().map((r) => (
              <div key={r.id} className="bg-sky-50/60 border border-sky-100 rounded-2xl px-3 py-2.5 flex gap-3 items-center">
                <span className="text-2xl">💧</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-extrabold text-gray-800">{new Date(r.inicio).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })} · {r.duracionMin} min · {r.aguaL} L</p>
                  <p className="text-[12px] text-gray-500 font-medium truncate">{r.motivo} · {r.origen}</p>
                </div>
              </div>
            ))}
            {riegos.length === 0 && <p className="text-center text-gray-400 font-bold text-[13px] py-4">Aún no hay riegos hoy</p>}
          </div>
        </Card>
      )}

      {tab === "humedad" && (
        <Card>
          <SectionTitle emoji="📈" title="Curva de humedad 24 h" sub="Sensor capacitivo · ideal pepino 40–70%" />
          <div className="h-56 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={humData} margin={{ left: -18, right: 8, top: 4 }}>
                <XAxis dataKey="hora" tick={{ fontSize: 9, fontWeight: 700 }} interval={7} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, fontSize: 12, fontWeight: 700 }} formatter={(v) => [`${v}%`, "Humedad"]} />
                <Area type="monotone" dataKey="humedad" stroke="#16a34a" strokeWidth={2.5} fill="#86efac" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[
              ["Mín", `${Math.min(...serie.map((s) => s.humedad)).toFixed(1)}%`],
              ["Prom", `${(serie.reduce((a, s) => a + s.humedad, 0) / serie.length).toFixed(1)}%`],
              ["Máx", `${Math.max(...serie.map((s) => s.humedad)).toFixed(1)}%`],
            ].map(([l, v]) => (
              <div key={l} className="bg-leaf-50 border border-leaf-100 rounded-2xl py-2">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase">{l}</p>
                <p className="font-display font-bold text-lg text-leaf-900">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
