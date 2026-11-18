import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { MatchaSprig } from './Botanicals'

export function Card({ title, icon: Icon, action, className = '', children }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <h3>
            {Icon && (
              <span className="card-icon">
                <Icon size={16} />
              </span>
            )}
            {title}
          </h3>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, art, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="page-header-actions">{children}</div>
      {art && <div className="page-header-art">{art}</div>}
    </div>
  )
}

export function Stat({ label, value, tone, icon: Icon, hint }) {
  return (
    <div className={`stat ${tone || ''}`}>
      {Icon && (
        <span className="stat-icon">
          <Icon size={18} />
        </span>
      )}
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  )
}

export function ProgressRing({ value, size = 150, stroke = 14, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value || 0))
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ring-track)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--leaf-light)" />
            <stop offset="1" stopColor="var(--leaf-dark)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

export function Bar({ value, tone = '' }) {
  const v = Math.max(0, Math.min(1, value || 0))
  return (
    <div className={`bar ${tone}`}>
      <span style={{ width: `${v * 100}%` }} />
    </div>
  )
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <MatchaSprig className="empty-art" />
      <h4>{title}</h4>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

// Generic add/edit form. `fields`: [{ name, label, type, options, required, full, placeholder }]
export function FormModal({ title, fields, initial = {}, onSave, onClose, onDelete }) {
  const [values, setValues] = useState(() => {
    const v = {}
    for (const f of fields) {
      const iv = initial[f.name]
      v[f.name] =
        f.type === 'checkbox' ? (iv ?? f.default ?? false) : iv ?? f.default ?? ''
    }
    return v
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const set = (name, val) => setValues((s) => ({ ...s, [name]: val }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const clean = {}
    for (const f of fields) {
      let v = values[f.name]
      if (f.type === 'number') v = v === '' || v === null ? null : Number(v)
      else if (f.type !== 'checkbox' && v === '') v = null
      clean[f.name] = v
    }
    try {
      await onSave(clean)
      onClose()
    } catch (ex) {
      setErr(ex.message || 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        {fields.map((f) => (
          <label key={f.name} className={`field ${f.full || f.type === 'textarea' ? 'full' : ''} ${f.type === 'checkbox' ? 'check' : ''}`}>
            {f.type !== 'checkbox' && <span>{f.label}{f.required && ' *'}</span>}
            {f.type === 'select' ? (
              <select value={values[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} required={f.required}>
                {!f.required && <option value="">—</option>}
                {f.options.map((o) => {
                  const [val, lab] = Array.isArray(o) ? o : [o, o]
                  return (
                    <option key={val} value={val}>
                      {lab}
                    </option>
                  )
                })}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea rows={3} value={values[f.name] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === 'checkbox' ? (
              <>
                <input type="checkbox" checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                <span>{f.label}</span>
              </>
            ) : (
              <input
                type={f.type || 'text'}
                step={f.type === 'number' ? 'any' : undefined}
                value={values[f.name] ?? ''}
                placeholder={f.placeholder}
                required={f.required}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
          </label>
        ))}
        {err && <p className="error full">{err}</p>}
        <div className="form-actions full">
          {onDelete && (
            <DeleteButton
              onConfirm={async () => {
                await onDelete()
                onClose()
              }}
            />
          )}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function DeleteButton({ onConfirm, label = 'Delete' }) {
  const [sure, setSure] = useState(false)
  return sure ? (
    <span className="confirm">
      Sure?
      <button type="button" className="btn danger sm" onClick={onConfirm}>
        Yes, delete
      </button>
      <button type="button" className="btn ghost sm" onClick={() => setSure(false)}>
        No
      </button>
    </span>
  ) : (
    <button type="button" className="btn ghost danger-text sm" onClick={() => setSure(true)}>
      <Trash2 size={14} /> {label}
    </button>
  )
}

export function Loading() {
  return (
    <div className="loading">
      <span className="leaf-spin" />
    </div>
  )
}

export function ErrorNote({ error }) {
  if (!error) return null
  return (
    <p className="error">
      Couldn’t load data: {error}. If this is the first time, make sure the database setup step was run in Supabase.
    </p>
  )
}
