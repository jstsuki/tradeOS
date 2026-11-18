import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { History as HistoryIcon, ChevronDown, ListChecks, ArrowUpRight, ArrowDownRight, Target, Check, CircleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { useSettings } from '../lib/settings'
import { signedMoney, sum, niceDate, pnlClass, todayISO } from '../lib/format'
import { Card, Toolbar, Bar, Empty, Loading, ErrorNote, Seg } from '../components/ui'

const RANGES = [['30', '30 days'], ['90', '90 days'], ['all', 'All time']]

export default function History() {
  const { settings } = useSettings()
  const trades = useTable('trades', { order: 'trade_date' })
  const items = useTable('checklist_items', { order: 'sort', ascending: true, eq: { list: 'prep' } })
  const [checks, setChecks] = useState([])
  const [checksErr, setChecksErr] = useState(null)
  const [range, setRange] = useState('30')
  const [open, setOpen] = useState(() => new Set([todayISO()]))

  useEffect(() => {
    supabase
      .from('checklist_checks')
      .select('item_id, check_date')
      .then(({ data, error }) => (error ? setChecksErr(error.message) : setChecks(data)))
  }, [])

  const goal = Number(settings?.daily_goal) || 1000

  const days = useMemo(() => {
    const prepIds = new Set(items.rows.map((i) => i.id))
    const map = {}
    const day = (d) => (map[d] = map[d] || { date: d, trades: [], ticked: new Set() })
    trades.rows.forEach((t) => day(t.trade_date).trades.push(t))
    checks.forEach((c) => prepIds.has(c.item_id) && day(c.check_date).ticked.add(c.item_id))
    let list = Object.values(map).sort((a, b) => b.date.localeCompare(a.date))
    if (range !== 'all') {
      const d = new Date(todayISO() + 'T12:00:00')
      d.setDate(d.getDate() - Number(range) + 1)
      const from = d.toISOString().slice(0, 10)
      list = list.filter((x) => x.date >= from)
    }
    return list
  }, [trades.rows, checks, items.rows, range])

  const toggle = (d) => {
    const n = new Set(open)
    n.has(d) ? n.delete(d) : n.add(d)
    setOpen(n)
  }

  const loading = trades.loading || items.loading

  return (
    <div className="page">
      <Toolbar>
        <Seg value={range} onChange={setRange} options={RANGES} />
        <span className="toolbar-sub">Each day: prep, trades and result</span>
      </Toolbar>
      <ErrorNote error={trades.error || checksErr} />

      {loading ? (
        <Loading />
      ) : days.length === 0 ? (
        <Card><Empty icon={HistoryIcon} title="No history yet" text="Tick your market prep or log a trade, and each day is kept here." action={<Link to="/journal" className="btn sm">Go to journal</Link>} /></Card>
      ) : (
        <div className="history">
          {days.map((d) => {
            const pnl = sum(d.trades, 'pnl')
            const wins = d.trades.filter((t) => Number(t.pnl) > 0).length
            const offPlan = d.trades.filter((t) => !t.followed_plan).length
            const total = items.rows.length
            const isOpen = open.has(d.date)
            return (
              <Card key={d.date} className={`history-day ${isOpen ? 'open' : ''}`}>
                <button className="history-head" onClick={() => toggle(d.date)} aria-expanded={isOpen}>
                  <div className="history-date">
                    <strong>{new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</strong>
                    <small>{niceDate(d.date)}</small>
                  </div>
                  <div className="history-badges">
                    <span className="hbadge"><ListChecks size={14} /> {d.ticked.size}/{total}</span>
                    <span className="hbadge">{d.trades.length} trade{d.trades.length === 1 ? '' : 's'}</span>
                    {pnl >= goal && <span className="hbadge goal"><Target size={14} /> Goal</span>}
                    {offPlan > 0 && <span className="hbadge warn"><CircleAlert size={14} /> {offPlan} off plan</span>}
                  </div>
                  <strong className={`history-pnl ${pnlClass(pnl)}`}>{d.trades.length ? signedMoney(pnl) : '—'}</strong>
                  <ChevronDown size={18} className="history-chev" />
                </button>

                {isOpen && (
                  <div className="history-body">
                    <div>
                      <h4 className="history-sub"><ListChecks size={15} /> Market prep</h4>
                      <Bar value={total ? d.ticked.size / total : 0} />
                      <ul className="history-checks">
                        {items.rows.map((i) => (
                          <li key={i.id} className={d.ticked.has(i.id) ? 'yes' : 'no'}>
                            <span className="dot" />
                            {i.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="history-sub"><HistoryIcon size={15} /> Trades {d.trades.length > 0 && <small className="muted">· {wins} win{wins === 1 ? '' : 's'}</small>}</h4>
                      {d.trades.length === 0 ? (
                        <p className="muted small">No trades this day.</p>
                      ) : (
                        d.trades.map((t) => (
                          <div key={t.id} className="trade-row static">
                            <span className={`dir ${t.direction === 'Long' ? 'long' : 'short'}`}>
                              {t.direction === 'Long' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                            </span>
                            <div className="trade-main">
                              <strong>{t.symbol}</strong>
                              <small>{[t.direction, t.mood].filter(Boolean).join(' · ')}</small>
                              {t.notes && <p className="trade-notes">{t.notes}</p>}
                            </div>
                            <span className={`plan ${t.followed_plan ? 'ok' : 'off'}`}>
                              {t.followed_plan ? <Check size={13} /> : <CircleAlert size={13} />}
                            </span>
                            <div className="trade-pnl"><strong className={pnlClass(Number(t.pnl))}>{signedMoney(t.pnl)}</strong></div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
