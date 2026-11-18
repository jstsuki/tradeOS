// Calculations shared across pages. Everything is derived from stored records only.
import { todayISO } from './format'

export const toISO = (d) => {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}
export const parseISO = (s) => new Date(s + 'T12:00:00')

export const addDays = (iso, n) => {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

// Monday of the week containing `iso`.
export const weekStart = (iso) => {
  const d = parseISO(iso)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toISO(d)
}

export const dailyPnl = (trades) => {
  const m = {}
  for (const t of trades) m[t.trade_date] = (m[t.trade_date] || 0) + (Number(t.pnl) || 0)
  return m
}

// Buckets realized P&L by day / week / month for the chart, within a sensible window.
export function pnlSeries(trades, period) {
  const today = todayISO()
  const key =
    period === 'weekly' ? (d) => weekStart(d) : period === 'monthly' ? (d) => d.slice(0, 7) : (d) => d
  const from =
    period === 'weekly' ? addDays(weekStart(today), -7 * 11) : period === 'monthly' ? addDays(today, -365) : addDays(today, -29)
  const m = {}
  for (const t of trades) {
    if (t.trade_date < from || t.trade_date > today) continue
    const k = key(t.trade_date)
    m[k] = (m[k] || 0) + (Number(t.pnl) || 0)
  }
  let run = 0
  return Object.keys(m)
    .sort()
    .map((k) => {
      run += m[k]
      const label =
        period === 'monthly'
          ? parseISO(k + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : parseISO(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return { key: k, label: period === 'weekly' ? `Wk of ${label}` : label, pnl: round(m[k]), cumulative: round(run) }
    })
}

const round = (n) => Math.round(n * 100) / 100

// Account health from balance, size and max drawdown (static approximation).
export const FUNDED_BUFFER = { 25000: 1000, 50000: 2000 }

export function accountMetrics(a, trades = []) {
  const size = Number(a.account_size) || 0
  const bal = a.current_balance == null ? null : Number(a.current_balance)
  const profit = bal != null && size ? bal - size : null
  const target = Number(a.profit_target) || 0
  const funded = a.kind === 'funded'
  // Funded accounts start with a $1,000 buffer on 25K and $2,000 on 50K unless set otherwise.
  const dd = Number(a.max_drawdown) || (funded ? FUNDED_BUFFER[size] || 0 : 0)
  // Evaluations: the drawdown is a fixed limit that stays at its full amount. Only funded accounts have a live buffer.
  const cushion = !funded ? (dd || null) : bal != null && size && dd ? Math.max(bal - (size - dd), 0) : null
  const ddUsed = cushion != null ? Math.min(Math.max(1 - cushion / dd, 0), 1) : null
  const targetProgress = target && profit != null ? Math.max(profit, 0) / target : null
  const ratio = cushion != null ? cushion / dd : null
  const health = !funded || ratio == null ? null : ratio >= 0.6 ? 'Healthy' : ratio >= 0.3 ? 'Caution' : 'At risk'
  const tradingDays = new Set(trades.map((t) => t.trade_date)).size
  const journalPnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0)
  const wins = trades.filter((t) => Number(t.pnl) > 0).length
  return { size, bal, profit, target, dd, cushion, ddUsed, targetProgress, health, tradingDays, journalPnl, wins }
}

export const healthClass = (h) => (h ? h.toLowerCase().replace(/\s+/g, '-') : '')
