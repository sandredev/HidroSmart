import {
  faRotateLeft,
  faSeedling,
  faDroplet,
  faStopwatch,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { Fa } from "../components/FaIcon";
import { useFarm } from "../context/FarmContext";
import { Card, SectionTitle } from "../components/Layout";
import { CULTIVO } from "../lib/irrigation";

function SliderRow({ icon, label, value, display, min, max, onChange, hint, color }) {
  return (
    <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-extrabold text-gray-700 flex items-center gap-1.5">{icon}{label}</span>
        <span className={`text-[13px] font-black px-2.5 py-0.5 rounded-full ${color}`}>{display}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-green-500 h-2" />
      <p className="text-[11.5px] text-gray-500 font-medium mt-1">{hint}</p>
    </div>
  );
}

export default function Config() {
  const { umbralMin, umbralMax, tiempoMaxRiego, cantidadPlantas, setUmbralMin, setUmbralMax, setTiempoMaxRiego, setCantidadPlantas, resetDemo, simulando, setSimulando, pushDecision, humedad } = useFarm();

  const invalido = umbralMin >= umbralMax;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <SectionTitle emoji="🥒" title="Cultivo" sub={`${CULTIVO.nombre} · ${CULTIVO.etapa}`} />
        <div className="bg-leaf-50 border border-leaf-100 rounded-2xl p-3.5 text-[12.5px] font-medium text-gray-600 leading-relaxed">
          <p><b className="text-leaf-800">Humedad óptima:</b> {CULTIVO.humedadOptima[0]}–{CULTIVO.humedadOptima[1]}% · <b className="text-leaf-800">pH:</b> {CULTIVO.phOptimo}</p>
          <p className="mt-1"><b className="text-leaf-800">Método:</b> {CULTIVO.riegoSugerido}. El pepino tiene raíces superficiales: prefiere ciclos cortos y frecuentes.</p>
        </div>
        <div className="flex items-center justify-between mt-3 bg-white border border-gray-100 rounded-2xl px-3.5 py-2.5">
          <span className="text-[13px] font-extrabold text-gray-700">📡 Simulación sensor en vivo</span>
          <button onClick={() => setSimulando(!simulando)} className={`w-12 h-7 rounded-full transition relative ${simulando ? "bg-leaf-400" : "bg-gray-300"}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${simulando ? "left-6" : "left-1"}`} />
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle emoji="🎛️" title="Parámetros del sistema" sub="Lo que el controlador automático usa para decidir" />
        <div className="flex flex-col gap-2.5">
          <SliderRow icon={<Fa icon={faDroplet} size={15} className="text-sky-600" />} label="Umbral mínimo" value={umbralMin} display={`${umbralMin}%`} min={15} max={70} onChange={(v) => { setUmbralMin(v); }} hint="Bajo este valor se ACTIVA el riego. Recomendado pepino: 35–40%." color="bg-sky-100 text-sky-800" />
          <SliderRow icon={<Fa icon={faDroplet} size={15} className="text-leaf-600" />} label="Umbral máximo" value={umbralMax} display={`${umbralMax}%`} min={30} max={90} onChange={(v) => { setUmbralMax(v); }} hint="Al llegar aquí se DETIENE el riego. Recomendado: 60–70%." color="bg-leaf-100 text-leaf-800" />
          <SliderRow icon={<Fa icon={faStopwatch} size={15} className="text-amber-600" />} label="Tiempo máximo de riego" value={tiempoMaxRiego} display={`${tiempoMaxRiego} min`} min={2} max={60} onChange={(v) => { setTiempoMaxRiego(v); pushDecision("info", `T. máximo ajustado a ${v} min`, "Límite de seguridad anti-inundación actualizado manualmente."); }} hint="Freno de seguridad: aunque la humedad siga baja, el riego se corta al llegar aquí." color="bg-amber-100 text-amber-800" />
          <SliderRow icon={<Fa icon={faSeedling} size={15} className="text-leaf-700" />} label="Cantidad de plantas" value={cantidadPlantas} display={`${cantidadPlantas} 🥒`} min={1} max={100} onChange={(v) => setCantidadPlantas(v)} hint="Se usa para estimar litros por riego (≈0.12 L/min·planta)." color="bg-leaf-400 text-leaf-900" />
        </div>
        {invalido && (
          <p className="mt-2.5 text-[12.5px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 flex gap-1.5"><Fa icon={faCircleInfo} size={15} className="shrink-0 mt-0.5" /> El mínimo ({umbralMin}%) debe ser menor que el máximo ({umbralMax}%). Ajusta los valores.</p>
        )}
        {!invalido && (
          <p className="mt-2.5 text-[12px] font-semibold text-leaf-700 bg-leaf-50 border border-leaf-100 rounded-2xl px-3 py-2">✅ Lógica actual: regar si &lt; {umbralMin}% · detener si ≥ {umbralMax}% o a los {tiempoMaxRiego} min. Humedad ahora: {humedad}%.</p>
        )}
      </Card>

      <Card>
        <SectionTitle emoji="🧰" title="Zona de peligro" sub="Acciones irreversibles de demostración" />
        <button onClick={() => { if (confirm("¿Reiniciar la demo con valores de fábrica?")) resetDemo(); }} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-2xl py-3 flex items-center justify-center gap-2 text-[13px] transition active:scale-[0.98]">
          <Fa icon={faRotateLeft} size={16} /> Restablecer demo
        </button>
        <p className="text-[11px] text-gray-400 font-medium text-center mt-2">HidroSmart v1.0 · Proyecto universitario DyP · IoT + LLM</p>
      </Card>
    </div>
  );
}
