export const money = (n, opts = {}) => {
  const v = Number(n) || 0
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: opts.cents ? 2 : 0,
    minimumFractionDigits: opts.cents ? 2 : 0,
  })
}

export const signedMoney = (n) => {
  const v = Number(n) || 0
  return (v > 0 ? '+' : v < 0 ? '−' : '') + money(Math.abs(v))
}

export const pct = (n) => `${Math.round((Number(n) || 0) * 100)}%`

// Local calendar date as YYYY-MM-DD (not UTC), so "today" matches your clock.
export const todayISO = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export const niceDate = (iso) =>
  iso
    ? new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

export const sum = (rows, key) => rows.reduce((t, r) => t + (Number(r[key]) || 0), 0)

export const pnlClass = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : '')
