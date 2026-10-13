import { useFarm } from "../context/FarmContext";
import { estadoHumedad } from "../lib/irrigation";
import { Card, SectionTitle } from "./Layout";

export function MoistureGauge() {
  const { humedad, umbralMin, umbralMax, riegoActivo, minutosRegando } = useFarm();
  const est = estadoHumedad(humedad, umbralMin, umbralMax);
  const pct = Math.min(100, Math.max(0, humedad));
  const color = est.tono === "ok" ? "bg-leaf-400" : est.tono === "warn" ? "bg-amber-400" : "bg-red-400";
  const ring = est.tono === "ok" ? "border-leaf-300" : est.tono === "warn" ? "border-amber-300" : "border-red-300";

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-leaf-100 blur-2xl opacity-70" />
      <SectionTitle emoji="🌡️" title="Humedad del suelo" sub="Sensor capacitivo · actualizada en vivo" right={
        riegoActivo && (
          <span className="relative flex items-center gap-1.5 text-[11px] font-extrabold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full">
            <span className="absolute inset-0 rounded-full bg-sky-400 animate-[pulse-ring_1.6s_ease-out_infinite]" />
            <span className="relative">● {minutosRegando} min</span>
          </span>
        )
      } />
      <div className={`relative mx-auto w-44 h-44 rounded-full border-[10px] ${ring} bg-leaf-50 flex flex-col items-center justify-center shadow-inner`}>
        <span className="text-5xl">🌱</span>
        <span className="font-display font-bold text-4xl text-gray-800 leading-none mt-1">{humedad.toFixed(0)}<span className="text-xl text-gray-400">%</span></span>
        <span className={`mt-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${est.tono === "ok" ? "bg-leaf-400 text-leaf-900" : est.tono === "warn" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{est.etiqueta}</span>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1">
          <span>0%</span>
          <span className="text-leaf-700">Rango {umbralMin}–{umbralMax}%</span>
          <span>100%</span>
        </div>
        <div className="h-3.5 rounded-full bg-gray-100 relative overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-800/60" style={{ left: `${umbralMin}%` }} />
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-800/60" style={{ left: `${umbralMax}%` }} />
        </div>
        <p className="mt-2 text-[12.5px] text-gray-600 font-medium bg-leaf-50 border border-leaf-100 rounded-2xl px-3 py-2">💡 {est.consejo}</p>
      </div>
    </Card>
  );
}
