import { NavLink, useLocation } from "react-router-dom";
import {
  faSeedling,
  faClockRotateLeft,
  faRobot,
  faGear,
  faDroplet,
} from "@fortawesome/free-solid-svg-icons";
import { Fa } from "./FaIcon";
import { useFarm } from "../context/FarmContext";

export const tabs = [
  { to: "/", label: "Inicio", icon: faSeedling, end: true, desc: "Humedad y estado" },
  { to: "/historial", label: "Día", icon: faClockRotateLeft, desc: "Riegos y decisiones" },
  { to: "/asistente", label: "Asistente", icon: faRobot, desc: "Análisis LLM" },
  { to: "/config", label: "Ajustes", icon: faGear, desc: "Umbrales y plantas" },
];

export function Header({ headerRef }) {
  const { riegoActivo, modoLLM, humedad } = useFarm();
  return (
    <header ref={headerRef} className="fixed top-0 inset-x-0 z-30 bg-leaf-400/95 backdrop-blur border-b border-leaf-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center text-2xl animate-float-soft shrink-0">🥒</div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-lg leading-tight text-leaf-900">HidroSmart</h1>
          <p className="text-[12px] font-semibold text-leaf-800/80 -mt-0.5 truncate">Riego inteligente · Pepino en floración</p>
        </div>
        {/* Info extra en tablet/desktop */}
        <div className="hidden md:flex items-center gap-2 text-[12px] font-extrabold text-leaf-900 bg-white/70 border border-white rounded-2xl px-3 py-1.5">
          <span>🌡️ {humedad.toFixed(0)}%</span>
          <span className="opacity-30">·</span>
          <span>🕒 {new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div className="flex md:flex-row flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap ${riegoActivo ? "bg-sky-500 text-white" : "bg-white text-leaf-700"}`}>
            <Fa icon={faDroplet} size={12} />
            {riegoActivo ? "REGANDO" : "EN VIGILANCIA"}
          </span>
          {modoLLM === "control" && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500 text-white whitespace-nowrap">LLM: CONTROL ⚠️</span>
          )}
        </div>
      </div>
    </header>
  );
}

/** Navegación inferior — solo móvil/tablet pequeña */
export function BottomNav() {
  const location = useLocation();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-leaf-200 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto grid grid-cols-4 px-2">
        {tabs.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={() => {
              const active = end ? location.pathname === "/" : location.pathname.startsWith(to);
              return `flex flex-col items-center gap-0.5 py-2.5 rounded-2xl m-1 text-[11px] font-extrabold transition-all ${
                active ? "bg-leaf-400 text-leaf-900 shadow" : "text-gray-400 hover:text-leaf-700"
              }`;
            }}
          >
            <Fa icon={icon} size={21} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Barra lateral — solo desktop */
export function Sidebar() {
  const location = useLocation();
  const { humedad, riegoActivo, aguaHoy, riegos } = useFarm();
  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 sticky top-[77px] self-start h-[calc(100svh-96px)] bg-white rounded-3xl border border-leaf-100 shadow-[0_4px_20px_-6px_rgba(34,197,94,0.25)] p-4">
      <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-gray-400 px-2 mb-2">Navegación</p>
      <nav className="flex flex-col gap-1.5">
        {tabs.map(({ to, label, icon, end, desc }) => {
          const active = end ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-all ${
                active ? "bg-leaf-400 text-leaf-900 shadow font-extrabold" : "text-gray-500 hover:bg-leaf-50 hover:text-leaf-800 font-bold"
              }`}
            >
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${active ? "bg-white/80" : "bg-leaf-50 border border-leaf-100"}`}>
                <Fa icon={icon} size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] leading-tight">{label}</span>
                <span className={`block text-[11px] font-semibold ${active ? "text-leaf-800/70" : "text-gray-400"}`}>{desc}</span>
              </span>
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto bg-leaf-50 border border-leaf-100 rounded-2xl p-3.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-leaf-700">Estado en vivo</p>
        <p className="font-display font-bold text-2xl text-gray-800 mt-0.5">🌡️ {humedad.toFixed(1)}%</p>
        <p className="text-[12px] font-semibold text-gray-500">{riegoActivo ? "🚿 Regando ahora" : "👀 En vigilancia"} · 💧 {aguaHoy} L en {riegos.length} riegos</p>
      </div>
    </aside>
  );
}

export function Card({ children, className = "" }) {
  return <section className={`bg-white rounded-3xl shadow-[0_4px_20px_-6px_rgba(34,197,94,0.25)] border border-leaf-100 p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ emoji, title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="min-w-0">
        <h2 className="font-display font-bold text-[16px] sm:text-[17px] text-gray-800">{emoji} {title}</h2>
        {sub && <p className="text-[12.5px] text-gray-500 font-medium leading-snug mt-0.5">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
