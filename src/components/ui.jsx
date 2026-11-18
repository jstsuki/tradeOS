import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, ChevronDown, Sparkles } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { chartTooltip } from '../pages/chartTheme'

export function Card({ title, icon: Icon, action, className = '', children, onClick, hint, id }) {
  const clickProps = onClick
    ? { onClick, role: 'button', tabIndex: 0, 'aria-label': hint || title, onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onClick(e)) }
    : {}
  return (
    <section id={id} className={`card ${className}`} {...clickProps}>
      {(title || action) && (
        <header className="card-head">
          <h3>
            {Icon && (
              <span className="card-icon">
                <Icon size={15} />
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

// Compact row of page controls (filters on the left, actions on the right).
export function Toolbar({ children, actions }) {
  return (
    <div className="toolbar">
      {children}
      <span className="spacer" />
      {actions}
    </div>
  )
}

export function Stat({ label, value, tone, icon: Icon, hint }) {
  return (
    <div className={`stat ${tone || ''}`}>
      {Icon && (
        <span className="stat-icon">
          <Icon size={16} />
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  )
}

export function Metric({ label, icon: Icon, value, tone, sub, visual, selected, onClick, hint }) {
  return (
    <Card className={`metric ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`} onClick={onClick} hint={hint}>
      <div className="metric-body">
        <div className="metric-label">
          {Icon && <Icon size={15} />}
          {label}
          {hint && <span className="card-hint">{hint}</span>}
        </div>
        <div className={`metric-value ${tone || ''}`}>{value}</div>
        {sub && <div className="metric-sub">{sub}</div>}
      </div>
      {visual}
    </Card>
  )
}

export function Delta({ value, suffix = '' }) {
  if (value == null || !isFinite(value)) return null
  const up = value >= 0
  return (
    <span className={`delta ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(Math.round(value))}
      {suffix}
    </span>
  )
}

export function ProgressRing({ value, size = 64, stroke = 7, colors = ['#F16A9B', '#A99BFF'], children }) {
  const id = useId().replace(/:/g, '')
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value || 0))
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(v))
    return () => cancelAnimationFrame(t)
  }, [v])
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={`rg${id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={colors[0]} />
            <stop offset="1" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#rg${id})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

export function Bar({ value, tone = '', thin }) {
  const v = Math.max(0, Math.min(1, value || 0))
  return (
    <div className={`bar ${tone} ${thin ? 'thin' : ''}`}>
      <span style={{ width: `${v * 100}%` }} />
    </div>
  )
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([v, l]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)} role="tab" aria-selected={value === v}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="sw" />
      {label}
    </label>
  )
}

export function Expander({ title, icon: Icon, meta, children, defaultOpen = false, open: openProp, onToggle }) {
  const [openState, setOpenState] = useState(defaultOpen)
  const open = openProp ?? openState
  const setOpen = onToggle || setOpenState
  return (
    <div className={`expander ${open ? 'open' : ''}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}>
        {Icon && <Icon size={15} className="muted" />}
        {title}
        <span className="exp-meta">
          {meta}
          <ChevronDown size={16} className="chev" />
        </span>
      </button>
      {open && <div className="exp-body">{children}</div>}
    </div>
  )
}

export function Donut({ data, size = 140, colors, center }) {
  const total = data.reduce((t, d) => t + d.value, 0)
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={total ? data : [{ name: 'none', value: 1 }]} dataKey="value" innerRadius="70%" outerRadius="100%" paddingAngle={total && data.length > 1 ? 3 : 0} stroke="none" startAngle={90} endAngle={-270} isAnimationActive>
            {(total ? data : [{}]).map((d, i) => (
              <Cell key={i} fill={total ? colors[i % colors.length] : 'rgba(255,255,255,0.07)'} />
            ))}
          </Pie>
          {total > 0 && <Tooltip {...chartTooltip} formatter={(v, n) => [Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), n]} />}
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="ring-center" style={{ pointerEvents: 'none' }}>{center}</div>}
    </div>
  )
}

export function Empty({ title, text, action, icon: Icon = Sparkles, compact }) {
  return (
    <div className={`empty ${compact ? 'compact' : ''}`}>
      <span className="empty-icon">
        <Icon size={20} />
      </span>
      <h4>{title}</h4>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  )
}

function useLockScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

export function Modal({ title, onClose, children }) {
  useEscape(onClose)
  useLockScroll()
  return createPortal(
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
    </div>,
    document.body,
  )
}

export function Drawer({ title, icon, onClose, children }) {
  useEscape(onClose)
  useLockScroll()
  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-head">
          {icon}
          <h3>{title}</h3>
          <span className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        {children}
      </aside>
    </>,
    document.body,
  )
}

// Generic add/edit form. `fields`: [{ name, label, type, options, required, full, placeholder, hint }]
export function FormModal({ title, fields, initial = {}, onSave, onClose, onDelete }) {
  const [values, setValues] = useState(() => {
    const v = {}
    for (const f of fields) {
      const iv = initial?.[f.name]
      v[f.name] = f.type === 'checkbox' ? (iv ?? f.default ?? false) : iv ?? f.default ?? ''
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
            {f.type !== 'checkbox' && (
              <span>
                {f.label}
                {f.required && ' *'}
              </span>
            )}
            {f.type === 'select' ? (
              <select value={values[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} required={f.required}>
                {!f.required && <option value="">—</option>}
                {(values[f.name] && !f.options.some((o) => (Array.isArray(o) ? o[0] : o) === values[f.name]) ? [values[f.name], ...f.options] : f.options).map((o) => {
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
            {f.hint && <span className="field-hint">{f.hint}</span>}
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
      <span className="spinner" />
    </div>
  )
}

export function ErrorNote({ error }) {
  if (!error) return null
  return <p className="error">Couldn’t load data: {error}</p>
}
