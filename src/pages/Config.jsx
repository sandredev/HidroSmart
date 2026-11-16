import { useState } from 'react'
import { PageIntro } from '../components/Interface.jsx'
import { validateSettings } from '../lib/demo.js'

function NumberField({ id, label, value, onChange, min, max, step, unit }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="field-control">
        <input id={id} name={id} type="number" inputMode={step === 'any' ? 'decimal' : 'numeric'}
          value={value} onChange={(event) => onChange(event.target.value)} min={min} max={max} step={step} required />
        {unit && <span aria-hidden="true">{unit}</span>}
      </span>
    </label>
  )
}

export default function Config({ demo }) {
  const [draft, setDraft] = useState(demo.settings)
  const [feedback, setFeedback] = useState(null)

  function edit(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    setFeedback(null)
  }

  function save(event) {
    event.preventDefault()
    const next = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value === '' ? NaN : Number(value)]))
    const error = validateSettings(next)
    if (error) {
      setFeedback({ error, message: error })
      return
    }
    const persisted = demo.updateSettings(next)
    setFeedback({ message: persisted ? 'Ajustes guardados en este navegador.' : 'Ajustes aplicados para esta sesión.' })
  }

  return (
    <>
      <PageIntro title="Ajustes del cultivo" />
      <form className="settings" onSubmit={save} autoComplete="off" noValidate>
        <fieldset>
          <legend>Humedad del suelo</legend>
          <div className="setting-row">
            <p>Los valores van de 0 a 100% en la escala relativa. Calibra el sensor con el sustrato antes de aplicarlos al cultivo.</p>
            <div className="form-grid">
              <NumberField id="min" label="Umbral mínimo (%)" value={draft.min} onChange={(v) => edit('min', v)} min={0} max={100} step="any" unit="%" />
              <NumberField id="max" label="Umbral máximo (%)" value={draft.max} onChange={(v) => edit('max', v)} min={0} max={100} step="any" unit="%" />
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Riego y plantas</legend>
          <div className="setting-row">
            <p>El límite se aplica a cada ciclo. Registra de una a tres plantas para identificar la prueba en el historial.</p>
            <div className="form-grid">
              <NumberField id="seconds" label="Tiempo máximo (s)" value={draft.seconds} onChange={(v) => edit('seconds', v)} min={1} max={300} step={1} unit="s" />
              <NumberField id="plants" label="Cantidad de plantas" value={draft.plants} onChange={(v) => edit('plants', v)} min={1} max={3} step={1} />
            </div>
          </div>
        </fieldset>
        <div className="settings-footer">
          <button className="button button-primary" type="submit">Guardar ajustes</button>
          {feedback && <p className={feedback.error ? 'form-error' : 'form-success'} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
        </div>
      </form>
    </>
  )
}
