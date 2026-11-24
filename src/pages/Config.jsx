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
  const [edits, setEdits] = useState(null)
  const draft = edits ?? demo.settings
  const [feedback, setFeedback] = useState(null)
  const [saving, setSaving] = useState(false)

  function edit(field, value) {
    setEdits({ ...draft, [field]: value })
    setFeedback(null)
  }

  async function save(event) {
    event.preventDefault()
    const next = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value === '' ? NaN : Number(value)]))
    const error = validateSettings({ ...next, plants: demo.source === 'api' ? 1 : next.plants })
    if (error) {
      setFeedback({ error, message: error })
      return
    }
    if (saving) return
    setSaving(true)
    try {
      const persisted = await demo.updateSettings(next)
      setEdits(null)
      setFeedback({ message: demo.source === 'api' ? 'Configuración guardada en la API.' : persisted ? 'Ajustes guardados en este navegador.' : 'Ajustes aplicados para esta sesión.' })
    } catch (error) {
      setFeedback({ error: true, message: error.message })
    } finally { setSaving(false) }
  }

  return (
    <>
      <PageIntro title="Ajustes del cultivo" />
      {demo.settings.min == null ? <p className="empty-state">Consulta la configuración de la API antes de editarla.</p> : <form className="settings" onSubmit={save} autoComplete="off" noValidate>
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
          <legend>Riego</legend>
          <div className="setting-row">
            <p>El límite se aplica a cada ciclo de riego.</p>
            <div className="form-grid">
              <NumberField id="seconds" label="Tiempo máximo (s)" value={draft.seconds} onChange={(v) => edit('seconds', v)} min={1} max={300} step={1} unit="s" />
              {demo.source === 'demo' && <NumberField id="plants" label="Cantidad de plantas" value={draft.plants} onChange={(v) => edit('plants', v)} min={1} max={3} step={1} />}
            </div>
          </div>
        </fieldset>
        <div className="settings-footer">
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar ajustes'}</button>
          {feedback && <p className={feedback.error ? 'form-error' : 'form-success'} role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
        </div>
      </form>}
    </>
  )
}
