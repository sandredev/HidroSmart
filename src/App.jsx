import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/Interface.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Historial from './pages/Historial.jsx'
import Asistente from './pages/Asistente.jsx'
import Config from './pages/Config.jsx'
import { useDemo } from './lib/demo.js'

export default function App() {
  const demo = useDemo()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    document.getElementById('contenido')?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <Shell demo={demo}>
      <Routes>
        <Route path="/" element={<Dashboard demo={demo} />} />
        <Route path="/historial" element={<Historial demo={demo} />} />
        <Route path="/asistente" element={<Asistente demo={demo} />} />
        <Route path="/config" element={<Config demo={demo} />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Shell>
  )
}
