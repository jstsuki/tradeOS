import { useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, NotebookPen, CalendarDays, ArrowUpRight, ArrowDownRight, Check, CircleAlert } from 'lucide-react'
import { useTable } from '../lib/useTable'
import { signedMoney, sum, niceDate, pnlClass, todayISO } from '../lib/format'
import { Card, PageHeader, Empty, FormModal, Loading, ErrorNote } from '../components/ui'
import { MatchaSprig } from '../components/Botanicals'

const MOODS = ['😌 Calm', '🎯 Focused', '😊 Confident', '😬 Anxious', '😤 Frustrated', '🤑 Greedy', '😴 Tired', '😨 Fearful']

export default function Journal() {
  const trades = useTable('trades', { order: 'trade_date' })
  const accounts = useTable('accounts')
  const setups = useTable('playbook_setups', { ascending: true })
  const [modal, setModal] = useState(null)
  const [acct, setAcct] = useState('')
  const [day, setDay] = useState(null)

  const fields = [
    { name: 'trade_date', label: 'Date', type: 'date', required: true, default: day || todayISO() },
    { name: 'symbol', label: 'Symbol', required: true, placeholder: 'e.g. NQ' },
    { name: 'direction', label: 'Direction', type: 'select', options: ['Long', 'Short'], required: true, default: 'Long' },
    { name: 'pnl', label: 'P&L ($, after fees)', type: 'number', required: true },
    { name: 'account_id', label: 'Account', type: 'select', options: accounts.rows.map((a) => [a.id, `${a.firm}${a.label ? ` · ${a.label}` : ''}`]) },
    { name: 'setup_id', label: 'Playbook setup', type: 'select', options: setups.rows.map((s) => [s.id, s.name]) },
    { name: 'contracts', label: 'Contracts / size', type: 'number' },
    { name: 'r_multiple', label: 'R multiple', type: 'number', placeholder: 'e.g. 2 or -1' },
    { name: 'entry_price', label: 'Entry price', type: 'number' },
    { name: 'exit_price', label: 'Exit price', type: 'number' },
    { name: 'mood', label: 'How I felt', type: 'select', options: MOODS },
    { name: 'followed_plan', label: 'I followed my plan', type: 'checkbox', default: true },
    { name: 'notes', label: 'Notes & lessons', type: 'textarea' },
  ]

  const filtered = trades.rows.filter((t) => !acct || t.account_id === acct)
  const shown = day ? filtered.filter((t) => t.trade_date === day) : filtered

  const byDate = useMemo(() => {
    const g = {}
    for (const t of shown) (g[t.trade_date] = g[t.trade_date] || []).push(t)
    return Object.entries(g)
  }, [shown])

  const nameOf = (list, id, f) => list.find((x) => x.id === id)?.[f]

  return (
    <div className="page">
      <PageHeader title="Trading journal" subtitle="Every trade, every lesson, gently recorded" art={<MatchaSprig />}>
        <button className="btn" onClick={() => setModal({})}><Plus size={16} /> Log trade</button>
      </PageHeader>
      <ErrorNote error={trades.error} />

      <div className="grid journal-grid">
        <Card title="Calendar" icon={CalendarDays}>
          <PnlCalendar trades={filtered} selected={day} onSelect={(d) => setDay(d === day ? null : d)} />
        </Card>

        <Card
          title={day ? niceDate(day) : 'All trades'}
          icon={NotebookPen}
          action={
            <div className="row-actions">
              {day && <button className="chip on" onClick={() => setDay(null)}>Show all ✕</button>}
              <select className="mini-select" value={acct} onChange={(e) => setAcct(e.target.value)} aria-label="Filter by account">
                <option value="">All accounts</option>
                {accounts.rows.map((a) => <option key={a.id} value={a.id}>{a.firm}{a.label ? ` · ${a.label}` : ''}</option>)}
              </select>
            </div>
          }
        >
          {trades.loading ? (
            <Loading />
          ) : byDate.length === 0 ? (
            <Empty title={trades.rows.length ? 'No trades here' : 'Your journal is waiting'} text={trades.rows.length ? null : 'Log your first real trade and it will appear here.'} />
          ) : (
            <div className="day-groups">
              {byDate.map(([d, list]) => {
                const total = sum(list, 'pnl')
                return (
                  <div key={d} className="day-group">
                    <div className="day-head">
                      <span>{niceDate(d)}</span>
                      <strong className={pnlClass(total)}>{signedMoney(total)}</strong>
                    </div>
                    {list.map((t) => (
                      <button key={t.id} className="trade-row" onClick={() => setModal({ row: t })}>
                        <span className={`dir ${t.direction === 'Long' ? 'long' : 'short'}`}>
                          {t.direction === 'Long' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </span>
                        <div className="trade-main">
                          <strong>{t.symbol}</strong>
                          <small>
                            {[nameOf(setups.rows, t.setup_id, 'name'), nameOf(accounts.rows, t.account_id, 'firm'), t.mood].filter(Boolean).join(' · ') || t.direction}
                          </small>
                          {t.notes && <p className="trade-notes">{t.notes}</p>}
                        </div>
                        <span className={`plan ${t.followed_plan ? 'ok' : 'off'}`} title={t.followed_plan ? 'Followed plan' : 'Broke plan'}>
                          {t.followed_plan ? <Check size={13} /> : <CircleAlert size={13} />}
                        </span>
                        <div className="trade-pnl">
                          <strong className={pnlClass(Number(t.pnl))}>{signedMoney(t.pnl)}</strong>
                          {t.r_multiple != null && <small>{Number(t.r_multiple) > 0 ? '+' : ''}{t.r_multiple}R</small>}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {modal && (
        <FormModal
          title={modal.row ? 'Edit trade' : 'Log a trade'}
          fields={fields}
          initial={modal.row}
          onSave={(v) => (modal.row ? trades.update(modal.row.id, v) : trades.insert(v))}
          onDelete={modal.row && (() => trades.remove(modal.row.id))}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function PnlCalendar({ trades, selected, onSelect }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const days = new Date(y, m + 1, 0).getDate()
  const lead = cursor.getDay()
  const daily = {}
  for (const t of trades) daily[t.trade_date] = (daily[t.trade_date] || 0) + (Number(t.pnl) || 0)
  const maxAbs = Math.max(1, ...Object.values(daily).map(Math.abs))
  const today = todayISO()
  const iso = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const monthTotal = Object.entries(daily).filter(([k]) => k.startsWith(iso(1).slice(0, 7))).reduce((a, [, v]) => a + v, 0)

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => setCursor(new Date(y, m - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <div>
          <strong>{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
          <small className={pnlClass(monthTotal)}>{signedMoney(monthTotal)}</small>
        </div>
        <button className="icon-btn" onClick={() => setCursor(new Date(y, m + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>
      <div className="cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const key = iso(i + 1)
          const v = daily[key]
          const a = v ? 0.18 + 0.62 * (Math.abs(v) / maxAbs) : 0
          return (
            <button
              key={key}
              className={`cal-day ${key === today ? 'today' : ''} ${key === selected ? 'sel' : ''}`}
              style={v ? { background: v > 0 ? `rgba(122,154,91,${a})` : `rgba(214,128,128,${a})` } : undefined}
              onClick={() => onSelect(key)}
              title={v ? signedMoney(v) : ''}
            >
              <span>{i + 1}</span>
              {v ? <small>{Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}</small> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
