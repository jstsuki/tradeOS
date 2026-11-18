import { useMemo, useState } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, NotebookPen, CalendarDays, ArrowUpRight, ArrowDownRight, Check, CircleAlert,
  PieChart as PieIcon, ChartColumn, TrendingUp, Pencil, Sprout, Percent, Scale, Hash,
} from 'lucide-react'
import { BarChart, Bar as RBar, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { useTable } from '../lib/useTable'
import { signedMoney, money, sum, niceDate, pnlClass, todayISO, pct } from '../lib/format'
import { addDays, parseISO } from '../lib/metrics'
import { tradeFields, saveNewTrade, groupTrades, updateTrades, deleteTrades } from '../lib/tradeForm'
import { Card, Toolbar, Stat, Empty, FormModal, Loading, ErrorNote, Donut, Drawer } from '../components/ui'
import { C, chartTooltip, axis, shortMoney } from './chartTheme'


export default function Journal() {
  const trades = useTable('trades', { order: 'trade_date' })
  const accounts = useTable('accounts')
  const setups = useTable('playbook_setups', { ascending: true })
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null) // key of the selected trade group
  const [acct, setAcct] = useState('')
  const [day, setDay] = useState(null)

  const editingGroup = (modal?.group?.rows.length || 0) > 1
  const fields = tradeFields(accounts.rows, setups.rows, day, { editingGroup })

  // Filter: one account, or a whole firm ("firm:Lucid")
  const firmOf = Object.fromEntries(accounts.rows.map((a) => [a.id, a.firm]))
  const firms = [...new Set(accounts.rows.map((a) => a.firm))].sort()
  const filtered = trades.rows.filter((t) => !acct || (acct.startsWith('firm:') ? firmOf[t.account_id] === acct.slice(5) : t.account_id === acct))
  const shown = day ? filtered.filter((t) => t.trade_date === day) : filtered
  const nameOf = (list, id, f) => list.find((x) => x.id === id)?.[f]
  const acctName = (id) => {
    const a = accounts.rows.find((x) => x.id === id)
    return a ? `${a.firm}${a.label ? ` · ${a.label}` : ''}` : 'Brokerage / personal'
  }

  // A copy trade on 5 accounts is one execution: it counts once for win rate, its P&L is the total.
  const execs = useMemo(() => groupTrades(filtered), [filtered])
  const shownGroups = useMemo(() => groupTrades(shown), [shown])
  const wins = execs.filter((g) => g.pnl > 0)
  const losses = execs.filter((g) => g.pnl < 0)
  const even = execs.length - wins.length - losses.length
  const net = sum(filtered, 'pnl')
  const gw = wins.reduce((t, g) => t + g.pnl, 0)
  const gl = Math.abs(losses.reduce((t, g) => t + g.pnl, 0))

  const last30 = useMemo(() => {
    const from = addDays(todayISO(), -29)
    const m = {}
    filtered.forEach((t) => t.trade_date >= from && (m[t.trade_date] = (m[t.trade_date] || 0) + Number(t.pnl)))
    return Object.keys(m).sort().map((d) => ({ d, label: parseISO(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), pnl: m[d] }))
  }, [filtered])

  const detailGroup = detail ? execs.find((g) => g.key === detail) || shownGroups.find((g) => g.key === detail) : null

  const trend = useMemo(() => {
    let run = 0
    return [...execs]
      .sort((a, b) => a.first.trade_date.localeCompare(b.first.trade_date) || (a.first.created_at || '').localeCompare(b.first.created_at || ''))
      .map((g, i) => {
        run += g.pnl
        return { n: i + 1, cumulative: run, date: niceDate(g.first.trade_date) }
      })
  }, [execs])

  return (
    <div className="page">
      <div className="stats-row">
        <Stat icon={Sprout} label="Net P&L" value={filtered.length ? signedMoney(net) : '—'} tone={pnlClass(net)} hint={`${execs.length} trades${execs.length !== filtered.length ? ` · ${filtered.length} account fills` : ''}`} />
        <Stat icon={Percent} label="Win rate" value={execs.length ? pct(wins.length / execs.length) : '—'} hint={`${wins.length}W · ${losses.length}L${even ? ` · ${even} BE` : ''}`} />
        <Stat icon={Scale} label="Profit factor" value={gl ? (gw / gl).toFixed(2) : gw ? '∞' : '—'} hint={gl ? 'Gross win ÷ gross loss' : 'Needs a losing trade'} />
        <Stat icon={Hash} label="Avg win / loss" value={wins.length && losses.length ? `${money(gw / wins.length)} / ${money(gl / losses.length)}` : '—'} hint={wins.length && losses.length ? `Ratio ${((gw / wins.length) / (gl / losses.length)).toFixed(2)}` : 'Needs wins and losses'} />
      </div>

      <Toolbar actions={<button className="btn" onClick={() => setModal({})}><Plus size={15} /> Log trade</button>}>
        <select className="mini-select" value={acct} onChange={(e) => setAcct(e.target.value)} aria-label="Filter by account">
          <option value="">All accounts</option>
          {firms.map((f) => <option key={f} value={`firm:${f}`}>All {f} accounts</option>)}
          {accounts.rows.map((a) => <option key={a.id} value={a.id}>{a.firm}{a.label ? ` · ${a.label}` : ''}</option>)}
        </select>
        {day && <button className="chip on" onClick={() => setDay(null)}>{niceDate(day)} ✕</button>}
      </Toolbar>
      <ErrorNote error={trades.error} />

      <div className="grid three">
        <Card title="Calendar" icon={CalendarDays}>
          <PnlCalendar trades={filtered} selected={day} onSelect={(d) => setDay(d === day ? null : d)} />
        </Card>
        <Card title="Win / loss split" icon={PieIcon}>
          {execs.length === 0 ? (
            <Empty compact icon={PieIcon} title="No trades yet" />
          ) : (
            <div className="donut-wrap">
              <Donut
                size={140}
                colors={[C.violet, C.pink, '#6F6A7D']}
                data={[{ name: 'Wins', value: wins.length }, { name: 'Losses', value: losses.length }, { name: 'Breakeven', value: even }].filter((d) => d.value)}
                center={<><span className="ring-value" style={{ fontSize: '1.1rem' }}>{pct(wins.length / execs.length)}</span><span className="ring-sub">win rate</span></>}
              />
              <div className="split-legend">
                <div><i style={{ background: C.violet }} /> Wins <strong>{wins.length}</strong></div>
                <div><i style={{ background: C.pink }} /> Losses <strong>{losses.length}</strong></div>
                {even > 0 && <div><i style={{ background: '#6F6A7D' }} /> Breakeven <strong>{even}</strong></div>}
                <div><i style={{ background: 'transparent' }} /> Gross won <strong className="pos">{money(gw)}</strong></div>
                <div><i style={{ background: 'transparent' }} /> Gross lost <strong className="neg">{money(gl)}</strong></div>
              </div>
            </div>
          )}
        </Card>
        <Card title="Daily P&L · 30 days" icon={ChartColumn}>
          {last30.length === 0 ? (
            <Empty compact icon={ChartColumn} title="No trades in the last 30 days" />
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={last30} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis dataKey="label" {...axis} minTickGap={16} />
                  <YAxis {...axis} width={46} tickFormatter={shortMoney} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                  <Tooltip {...chartTooltip} formatter={(v) => [signedMoney(v), 'P&L']} />
                  <RBar dataKey="pnl" radius={[4, 4, 4, 4]} maxBarSize={18}>
                    {last30.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? C.violet : C.pink} />)}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid journal-grid">
        <Card title="Performance trend" icon={TrendingUp} action={<span className="faint small">by trade</span>}>
          {trend.length < 2 ? (
            <Empty compact icon={TrendingUp} title="Needs at least 2 trades" text="Your running P&L curve appears once there’s a little history." />
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor={C.pink} stopOpacity={0.35} />
                      <stop offset="1" stopColor={C.pink} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis dataKey="n" {...axis} />
                  <YAxis {...axis} width={50} tickFormatter={shortMoney} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                  <Tooltip {...chartTooltip} labelFormatter={(n, p) => `Trade #${n} · ${p?.[0]?.payload?.date || ''}`} formatter={(v) => [signedMoney(v), 'Running P&L']} />
                  <Area type="monotone" dataKey="cumulative" stroke={C.pink} strokeWidth={2.5} fill="url(#trendFill)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title={day ? niceDate(day) : 'Trades'} icon={NotebookPen} action={<span className="faint small">{shown.length ? 'Click a trade for details' : ''}</span>}>
          {trades.loading ? (
            <Loading />
          ) : shown.length === 0 ? (
            <Empty compact icon={NotebookPen} title={trades.rows.length ? 'No trades here' : 'Your journal is empty'} text={trades.rows.length ? null : 'Log your first real trade to start your history.'} action={!trades.rows.length && <button className="btn sm" onClick={() => setModal({})}><Plus size={14} /> Log trade</button>} />
          ) : (
            <div className="trade-list">
              {shownGroups.map(({ key, first: t, rows, pnl }) => (
                <button key={key} className="trade-row" onClick={() => setDetail(key)}>
                  <span className={`dir ${t.direction === 'Long' ? 'long' : 'short'}`}>
                    {t.direction === 'Long' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  </span>
                  <div className="trade-main">
                    <strong>{t.symbol}{rows.length > 1 && <span className="copy-badge">×{rows.length}</span>}</strong>
                    <small>{[niceDate(t.trade_date), nameOf(setups.rows, t.setup_id, 'name'), rows.length > 1 ? `${nameOf(accounts.rows, t.account_id, 'firm')} copy` : nameOf(accounts.rows, t.account_id, 'firm')].filter(Boolean).join(' · ')}</small>
                  </div>
                  <span className={`plan ${t.followed_plan ? 'ok' : 'off'}`} title={t.followed_plan ? 'Followed plan' : 'Broke plan'}>
                    {t.followed_plan ? <Check size={12} /> : <CircleAlert size={12} />}
                  </span>
                  <div className="trade-pnl">
                    <strong className={pnlClass(pnl)}>{signedMoney(pnl)}</strong>
                    {t.r_multiple != null && <small>{Number(t.r_multiple) > 0 ? '+' : ''}{t.r_multiple}R</small>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {detailGroup && (() => {
        const detail = detailGroup.first
        const many = detailGroup.rows.length > 1
        return (
        <Drawer
          title={`${detail.symbol} · ${detail.direction}`}
          icon={<span className={`dir ${detail.direction === 'Long' ? 'long' : 'short'}`}>{detail.direction === 'Long' ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}</span>}
          onClose={() => setDetail(null)}
        >
          <div>
            <div className="metric-label">{many ? `Total across ${detailGroup.rows.length} accounts` : 'Result'}</div>
            <div className={`chart-total ${pnlClass(detailGroup.pnl)}`}>{signedMoney(detailGroup.pnl)}</div>
            <div className="metric-sub">{niceDate(detail.trade_date)}{many ? ` · ${signedMoney(detail.pnl)} per account` : ''}</div>
          </div>
          {many && (
            <div className="acct-breakdown">
              {detailGroup.rows.map((r) => (
                <div key={r.id}><span>{acctName(r.account_id)}</span><strong className={pnlClass(Number(r.pnl))}>{signedMoney(r.pnl)}</strong></div>
              ))}
            </div>
          )}
          <div className="detail-grid">
            {!many && <div><small>Account</small><strong>{acctName(detail.account_id)}</strong></div>}
            <div><small>Setup</small><strong>{nameOf(setups.rows, detail.setup_id, 'name') || '—'}</strong></div>
            <div><small>Contracts{many ? ' / acct' : ''}</small><strong>{detail.contracts ?? '—'}</strong></div>
            <div><small>R multiple</small><strong>{detail.r_multiple != null ? `${detail.r_multiple}R` : '—'}</strong></div>
            <div><small>Entry</small><strong>{detail.entry_price ?? '—'}</strong></div>
            <div><small>Exit</small><strong>{detail.exit_price ?? '—'}</strong></div>
            <div><small>Plan</small><strong className={detail.followed_plan ? 'pos' : ''} style={detail.followed_plan ? null : { color: 'var(--warn)' }}>{detail.followed_plan ? 'Followed' : 'Broke plan'}</strong></div>
            <div><small>Mood</small><strong>{detail.mood || '—'}</strong></div>
          </div>
          {detail.notes && <div className="detail-notes">{detail.notes}</div>}
          <button className="btn" onClick={() => { setModal({ group: detailGroup }); setDetail(null) }}><Pencil size={14} /> Edit {many ? `all ${detailGroup.rows.length} copies` : 'trade'}</button>
        </Drawer>
        )
      })()}

      {modal && (
        <FormModal
          title={modal.group ? (editingGroup ? `Edit copy trade (${modal.group.rows.length} accounts)` : 'Edit trade') : 'Log a trade'}
          fields={fields}
          initial={modal.group?.first}
          onSave={async (v) => {
            if (modal.group) await updateTrades(modal.group.rows.map((r) => r.id), v)
            else await saveNewTrade(v, accounts.rows)
            await trades.reload()
          }}
          onDelete={modal.group && (async () => { await deleteTrades(modal.group.rows.map((r) => r.id)); await trades.reload() })}
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
  const iso = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const monthKey = iso(1).slice(0, 7)
  const monthVals = Object.entries(daily).filter(([k]) => k.startsWith(monthKey))
  const maxAbs = Math.max(1, ...monthVals.map(([, v]) => Math.abs(v)))
  const monthTotal = monthVals.reduce((a, [, v]) => a + v, 0)
  const today = todayISO()

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => setCursor(new Date(y, m - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <div>
          <strong>{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
          <small className={pnlClass(monthTotal)}>{monthVals.length ? signedMoney(monthTotal) : 'No trades'}</small>
        </div>
        <button className="icon-btn" onClick={() => setCursor(new Date(y, m + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>
      <div className="cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const key = iso(i + 1)
          const v = daily[key]
          const a = v ? 0.25 + 0.65 * (Math.abs(v) / maxAbs) : 0
          return (
            <button
              key={key}
              className={`cal-day ${v ? 'has' : ''} ${key === today ? 'today' : ''} ${key === selected ? 'sel' : ''}`}
              style={v ? { background: v > 0 ? `rgba(169,155,255,${a})` : `rgba(241,106,155,${a})` } : undefined}
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
