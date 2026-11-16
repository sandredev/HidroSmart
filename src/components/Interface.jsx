import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink } from 'react-router-dom'
import { faSeedling } from '@fortawesome/free-solid-svg-icons'

const navigation = [
  { to: '/', label: 'Resumen' },
  { to: '/historial', label: 'Historial' },
  { to: '/config', label: 'Ajustes' },
  { to: '/asistente', label: 'HidroAI' },
]

export function Icon({ icon, className }) {
  return <FontAwesomeIcon icon={icon} className={className} aria-hidden="true" />
}

export function Shell({ demo, children }) {
  return (
    <>
      <a href="#contenido" className="skip">Ir al contenido</a>
      <header className="site-header">
        <div className="site-header-inner">
          <NavLink to="/" className="brand" end>
            <span className="brand-mark"><Icon icon={faSeedling} /></span>
            <span>HidroSmart<small>Riego de pepino</small></span>
          </NavLink>
          <nav aria-label="Navegación principal" className="navigation">
            {navigation.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className="nav-link">{label}</NavLink>
            ))}
          </nav>
          <span className="demo-label">Demostración</span>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="main">{children}</main>
      <footer className="site-footer">
        <span className="site-footer-device">Prototipo ESP8266</span>
        <label className="scenario">
          <span>Escenario</span>
          <select value={demo.scenario} onChange={(event) => demo.setScenario(event.target.value)}>
            <option value="normal">Operación normal</option>
            <option value="offline">Dispositivo sin conexión</option>
            <option value="empty">Sin datos</option>
            <option value="error">Error de comunicación</option>
            <option value="loading">Cargando datos</option>
          </select>
        </label>
      </footer>
    </>
  )
}

export function PageIntro({ title, description, children }) {
  return (
    <div className="page-intro">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {children}
    </div>
  )
}

export function EmptyState({ scenario, fallback }) {
  const messages = {
    loading: 'Cargando datos de demostración…',
    error: 'Error de comunicación. Selecciona «Operación normal» en el escenario de prueba para recuperar los datos de ejemplo.',
  }
  return <p className="empty-state" role="status">{messages[scenario] ?? fallback}</p>
}
