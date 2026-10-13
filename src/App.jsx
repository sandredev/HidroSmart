import { Routes, Route } from "react-router-dom";
import { Header, BottomNav, Sidebar } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Historial from "./pages/Historial";
import Asistente from "./pages/Asistente";
import Config from "./pages/Config";

function App() {
  return (
    <div className="min-h-svh bg-[#e8f7ec] flex flex-col">
      <Header />
      {/* Shell responsive: móvil 1 col · tablet más aire · desktop con sidebar */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex gap-5 px-3.5 sm:px-6 py-4 sm:py-6 items-start">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-24 lg:pb-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/asistente" element={<Asistente />} />
            <Route path="/config" element={<Config />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
          <p className="text-center text-[10.5px] font-bold text-leaf-700/50 mt-6 pb-1">
            HidroSmart 🥒 · Riego automático de pepino · IoT + LLM
          </p>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default App;
