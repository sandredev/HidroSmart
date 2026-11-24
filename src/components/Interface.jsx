import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { NavLink } from 'react-router-dom'
import { faSeedling, faCircleHalfStroke } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../lib/theme.js'

const navigation = [
  { to: '/', label: 'Resumen' },
  { to: '/historial', label: 'Historial' },
  { to: '/config', label: 'Ajustes' },
  { to: '/asistente', label: 'HidroAI' },
]

export function Icon({ icon, className }) {
  return <FontAwesomeIcon icon={icon} className={className} aria-hidden="true" />
}

export function Shell({ demo, setSource, children }) {
  const [theme, setTheme] = useTheme()
  const demoQuery = demo.source === 'demo' ? '?demo=1' : ''
  return (
    <>
      <a href="#contenido" className="skip">Ir al contenido</a>
      <header className="site-header">
        <div className="site-header-inner">
        <NavLink to={'/' + demoQuery} className="brand" end>
            <span className="brand-mark"><Icon icon={faSeedling} /></span>
            <span>HidroSmart<small>Riego de pepino</small></span>
          </NavLink>
          <nav aria-label="Navegación principal" className="navigation">
            {navigation.map(({ to, label }) => (
              <NavLink key={to} to={to + demoQuery} end={to === '/'} className="nav-link">{label}</NavLink>
            ))}
          </nav>
          <div className="header-tools">
            <span className="demo-label">{demo.source === 'demo' ? 'Demostración' : 'Sensor de humedad'}</span>
            <label className="theme-control">
              <Icon icon={faCircleHalfStroke} />
              <select aria-label="Tema" value={theme} onChange={event => setTheme(event.target.value)}>
                <option value="system">Automático</option>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </label>
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="main">
        {demo.errors?.length > 0 && <div className="api-notice" role="alert">
          <p>{[...new Set(demo.errors)].join(' ')}</p>
          <button className="chat-text-button" type="button" onClick={demo.refresh}>Reintentar</button>
        </div>}
        {children}
      </main>
      <footer className="site-footer">
        <span className="site-footer-device">Prototipo ESP8266</span>
        <label className="scenario">Origen de datos
          <select value={demo.source} onChange={event => setSource(event.target.value)}>
            <option value="api">API del cultivo</option>
            <option value="demo">Demostración</option>
          </select>
        </label>
        {demo.source === 'demo' && <label className="scenario">
          <span>Escenario</span>
          <select value={demo.scenario} onChange={(event) => demo.setScenario(event.target.value)}>
            <option value="normal">Operación normal</option>
            <option value="offline">Dispositivo sin conexión</option>
            <option value="empty">Sin datos</option>
            <option value="error">Error de comunicación</option>
            <option value="loading">Cargando datos</option>
          </select>
        </label>}
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
    loading: 'Consultando datos…',
    error: 'No se pudo completar la consulta. Reintenta cuando la API esté disponible.',
    uncalibrated: 'El sensor está enviando datos, pero necesita calibración antes de mostrar humedad.',
  }
  return <p className="empty-state" role="status">{messages[scenario] ?? fallback}</p>
}
