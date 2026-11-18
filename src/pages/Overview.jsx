import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CircleDollarSign, CalendarRange, ShieldHalf, Gauge, ChartSpline, Wallet, Building2, ListChecks, BadgeCheck,
  Calculator, StickyNote, Plus, SlidersHorizontal, X, Pencil, RotateCcw, OctagonAlert, Check, Minus, ArrowRight, FlaskConical, Landmark,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, BarChart, Bar as RBar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { useSettings } from '../lib/settings'
import { money, signedMoney, sum, todayISO, pnlClass, pct } from '../lib/format'
import { tradeFields } from '../lib/tradeForm'
import { pnlSeries, weekStart, addDays, dailyPnl, accountMetrics, healthClass } from '../lib/metrics'
import {
  Card, Toolbar, Metric, ProgressRing, Bar, Seg, Toggle, Expander, Donut, Empty, FormModal, Delta, ErrorNote,
} from '../components/ui'
import { C, chartTooltip, axis, shortMoney } from './chartTheme'

export default function Overview() {
  const { settings, save } = useSettings()
  const today = todayISO()
  const trades = useTable('trades', { order: 'trade_date', ascending: true })
  const accounts = useTable('accounts')
  const payouts = useTable('payouts')
  const expenses = useTable('expenses')
  const prepItems = useTable('checklist_items', { order: 'sort', ascending: true, eq: { list: 'prep' } })
  const validItems = useTable('checklist_items', { order: 'sort', ascending: true, eq: { list: 'validation' } })
  const [prepChecked, setPrepChecked] = useState(() => new Set())
  const [validChecked, setValidChecked] = useState(() => new Set())
  const [editSettings, setEditSettings] = useState(false)
  const [logTrade, setLogTrade] = useState(false)
  const [prepOpen, setPrepOpen] = useState(false)
  const navigate = useNavigate()
  const setups = useTable('playbook_setups', { ascending: true })

  useEffect(() => {
    supabase
      .from('checklist_checks')
      .select('item_id')
      .eq('check_date', today)
      .then(({ data }) => data && setPrepChecked(new Set(data.map((d) => d.item_id))))
  }, [today])

  const togglePrep = async (id) => {
    const next = new Set(prepChecked)
    const on = !next.has(id)
    on ? next.add(id) : next.delete(id)
    setPrepChecked(next)
    if (on) await supabase.from('checklist_checks').insert({ item_id: id, check_date: today })
    else await supabase.from('checklist_checks').delete().eq('item_id', id).eq('check_date', today)
  }
  const toggleValid = (id) => {
    const next = new Set(validChecked)
    next.has(id) ? next.delete(id) : next.add(id)
    setValidChecked(next)
  }

  // ---- Today & this week (real records only) ----
  const goal = Number(settings?.daily_goal) || 1000
  const maxLoss = Number(settings?.max_daily_loss) || 0
  const maxTrades = Number(settings?.max_trades_per_day) || 0
  const todays = trades.rows.filter((t) => t.trade_date === today)
  const todayPnl = sum(todays, 'pnl')
  const lossToday = Math.max(-todayPnl, 0)
  const riskLeft = maxLoss ? Math.max(maxLoss - lossToday, 0) : null

  const wk = weekStart(today)
  const lastWk = addDays(wk, -7)
  const weekTrades = trades.rows.filter((t) => t.trade_date >= wk && t.trade_date <= today)
  const lastWeekTrades = trades.rows.filter((t) => t.trade_date >= lastWk && t.trade_date < wk)
  const weekPnl = sum(weekTrades, 'pnl')
  const lastWeekPnl = sum(lastWeekTrades, 'pnl')
  const weekDelta = lastWeekTrades.length && lastWeekPnl !== 0 ? ((weekPnl - lastWeekPnl) / Math.abs(lastWeekPnl)) * 100 : null
  const weekBars = useMemo(() => {
    const d = dailyPnl(weekTrades)
    return ['M', 'T', 'W', 'T', 'F'].map((n, i) => ({ n, v: d[addDays(wk, i)] || 0 }))
  }, [weekTrades, wk])

  // ---- Discipline ----
  const prepTotal = prepItems.rows.length
  const prepDone = prepItems.rows.filter((i) => prepChecked.has(i.id)).length
  const validTotal = validItems.rows.length
  const validDone = validItems.rows.filter((i) => validChecked.has(i.id)).length
  const followed = todays.filter((t) => t.followed_plan).length
  const lossOk = !maxLoss || todayPnl > -maxLoss
  const countOk = !maxTrades || todays.length <= maxTrades
  const parts = []
  if (prepTotal && (prepDone || todays.length)) parts.push(prepDone / prepTotal)
  if (todays.length) parts.push(followed / todays.length)
  if (parts.length) parts.push(lossOk && countOk ? 1 : 0)
  const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : null
  const stopTrading = (maxLoss && todayPnl <= -maxLoss) || (maxTrades && todays.length >= maxTrades)

  // ---- Chart ----
  const [period, setPeriod] = useState('daily')
  const [showCum, setShowCum] = useState(true)
  const series = useMemo(() => pnlSeries(trades.rows, period), [trades.rows, period])
  const seriesTotal = series.length ? series[series.length - 1].cumulative : 0

  // ---- Accounts ----
  const active = accounts.rows.filter((a) => a.status === 'Active' && (a.kind === 'evaluation' || a.kind === 'funded'))
  const activeBal = sum(active, 'current_balance')

  // ---- Money ----
  const received = payouts.rows.filter((p) => p.status === 'Received')
  const fees = sum(expenses.rows, 'amount')
  const paid = sum(received, 'amount')
  const net = paid - fees
  const brokerage = trades.rows.filter((t) => !t.account_id)
  const brokeragePnl = sum(brokerage, 'pnl')
  const byFirm = useMemo(() => {
    const f = {}
    const g = (n) => (f[n] = f[n] || { firm: n, Fees: 0, Payouts: 0 })
    expenses.rows.forEach((e) => (g(e.firm).Fees += Number(e.amount) || 0))
    received.forEach((p) => (g(p.firm).Payouts += Number(p.amount) || 0))
    return Object.values(f).sort((a, b) => b.Payouts + b.Fees - (a.Payouts + a.Fees)).slice(0, 5)
  }, [expenses.rows, received])

  return (
    <div className="page">
      <Toolbar
        actions={
          <>
            <button className="btn ghost" onClick={() => setEditSettings(true)}><SlidersHorizontal size={15} /> Goals & limits</button>
            <button className="btn" onClick={() => setLogTrade(true)}><Plus size={15} /> Log trade</button>
          </>
        }
      >
        <span className="toolbar-sub">Log each trade as you take it. Your cards, chart and score update instantly.</span>
      </Toolbar>
      <ErrorNote error={trades.error || accounts.error} />
      {!trades.loading && !accounts.loading && (trades.rows.length === 0 || accounts.rows.length === 0) && (
        <div className="quickstart">
          <Link to="/evaluations" className={`qs-step ${accounts.rows.length ? 'done' : ''}`}>
            <span className="qs-num">{accounts.rows.length ? <Check size={14} /> : 1}</span>
            <div><strong>Add your accounts</strong><small>Evaluations & funded, with balance and rules</small></div>
          </Link>
          <button className={`qs-step ${prepDone ? 'done' : ''}`} onClick={() => { document.getElementById('discipline')?.scrollIntoView({ behavior: 'smooth' }); setPrepOpen(true) }}>
            <span className="qs-num">{prepDone ? <Check size={14} /> : 2}</span>
            <div><strong>Tick your market prep</strong><small>Each morning, before the open</small></div>
          </button>
          <button className={`qs-step ${trades.rows.length ? 'done' : ''}`} onClick={() => setLogTrade(true)}>
            <span className="qs-num">{trades.rows.length ? <Check size={14} /> : 3}</span>
            <div><strong>Log each trade</strong><small>Cards, charts and score fill in</small></div>
          </button>
        </div>
      )}

      {/* ---- Metric cards ---- */}
      <div className="metrics">
        <Metric
          selected
          onClick={() => setLogTrade(true)}
          hint="+ Log trade"
          label="Daily P&L"
          icon={CircleDollarSign}
          value={signedMoney(todayPnl)}
          tone={pnlClass(todayPnl)}
          sub={<>{pct(Math.max(todayPnl, 0) / goal)} of {money(goal)} goal · {todays.length} trade{todays.length === 1 ? '' : 's'}</>}
          visual={
            <ProgressRing value={todayPnl / goal}>
              <span className="ring-value">{Math.round(Math.max(todayPnl, 0) / goal * 100)}%</span>
            </ProgressRing>
          }
        />
        <Metric
          onClick={() => navigate('/journal')}
          hint="View journal"
          label="Weekly P&L"
          icon={CalendarRange}
          value={signedMoney(weekPnl)}
          tone={pnlClass(weekPnl)}
          sub={weekDelta != null ? <><Delta value={weekDelta} suffix="%" /> vs last week</> : `${weekTrades.length} trades this week`}
          visual={
            <div style={{ width: 84, height: 52 }}>
              <ResponsiveContainer>
                <BarChart data={weekBars} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
                  <RBar dataKey="v" radius={[3, 3, 3, 3]} isAnimationActive>
                    {weekBars.map((d, i) => <Cell key={i} fill={d.v >= 0 ? C.violet : C.pink} fillOpacity={d.v ? 1 : 0.15} />)}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
        />
        <Metric
          onClick={() => setEditSettings(true)}
          hint="Edit limits"
          label="Daily risk left"
          icon={ShieldHalf}
          value={riskLeft == null ? '—' : money(riskLeft)}
          tone={riskLeft != null && maxLoss && riskLeft / maxLoss < 0.3 ? 'neg' : ''}
          sub={maxLoss ? <>of {money(maxLoss)} max loss · {todays.length}/{maxTrades || '∞'} trades</> : 'Set a max daily loss'}
          visual={
            <ProgressRing value={maxLoss ? riskLeft / maxLoss : 0} colors={riskLeft != null && maxLoss && riskLeft / maxLoss < 0.3 ? ['#F16A9B', '#E2557F'] : ['#A99BFF', '#C58ACB']}>
              <span className="ring-value">{maxLoss ? Math.round((riskLeft / maxLoss) * 100) : 0}%</span>
            </ProgressRing>
          }
        />
        <Metric
          onClick={() => { const el = document.getElementById('discipline'); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setPrepOpen(true) }}
          hint="Open checklist"
          label="Discipline score"
          icon={Gauge}
          value={score == null ? '—' : score}
          tone={score == null ? '' : score >= 80 ? 'pos' : score < 50 ? 'neg' : ''}
          sub={score == null ? 'Starts when you prep or trade today' : `Prep ${prepDone}/${prepTotal} · Plan ${todays.length ? `${followed}/${todays.length}` : '—'}`}
          visual={
            <ProgressRing value={(score || 0) / 100} colors={['#C58ACB', '#A99BFF']}>
              <Gauge size={16} className="muted" />
            </ProgressRing>
          }
        />
      </div>

      {/* ---- Chart + accounts ---- */}
      <div className="grid main-side">
        <Card className="chart-card">
          <div className="chart-head">
            <div>
              <div className="metric-label"><ChartSpline size={15} /> Realized P&L</div>
              <div className={`chart-total ${pnlClass(seriesTotal)}`}>{series.length ? signedMoney(seriesTotal) : '—'}</div>
              <div className="metric-sub">
                {period === 'daily' ? 'Last 30 days' : period === 'weekly' ? 'Last 12 weeks' : 'Last 12 months'}
              </div>
            </div>
            <div className="row-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Toggle checked={showCum} onChange={setShowCum} label="Cumulative" />
              <Seg value={period} onChange={setPeriod} options={[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']]} />
            </div>
          </div>
          {series.length === 0 ? (
            <Empty
              icon={ChartSpline}
              title="No trades in this range yet"
              text="Log real trades in your journal and your P&L curve will draw itself here."
              action={<button className="btn sm" onClick={() => setLogTrade(true)}><Plus size={14} /> Log your first trade</button>}
            />
          ) : (
            <>
              <div className="chart-legend">
                <span><i style={{ background: C.pink }} /> {period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly'} P&L</span>
                {showCum && <span><i style={{ background: C.violet }} /> Cumulative</span>}
              </div>
              <div style={{ height: 290 }}>
                <ResponsiveContainer>
                  <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="pnlFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor={C.pink} stopOpacity={0.35} />
                        <stop offset="1" stopColor={C.pink} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis dataKey="label" {...axis} minTickGap={24} />
                    <YAxis {...axis} width={52} tickFormatter={shortMoney} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                    <Tooltip {...chartTooltip} formatter={(v, n) => [signedMoney(v), n === 'pnl' ? 'Realized P&L' : 'Cumulative']} />
                    <Area type="monotone" dataKey="pnl" stroke={C.pink} strokeWidth={2.5} fill="url(#pnlFill)" dot={{ r: 3, fill: C.pink, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    {showCum && <Line type="monotone" dataKey="cumulative" stroke={C.violet} strokeWidth={2} dot={false} strokeDasharray="5 4" />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>

        <div className="stack">
        <div className="balance-card">
          <div className="balance-top">
            <span>Active prop balance</span>
            <Landmark size={18} />
          </div>
          <div className="balance-value">{active.length ? money(activeBal, { cents: true }) : '—'}</div>
          <div className="balance-foot">
            <span>{active.filter((a) => a.kind === 'evaluation').length} evaluations · {active.filter((a) => a.kind === 'funded').length} funded</span>
            <span>{paid ? `${money(paid)} paid out` : ''}</span>
          </div>
        </div>
        <Card title="Account health" icon={Building2} action={active.length ? <Link to="/evaluations" className="link-btn">Manage <ArrowRight size={13} /></Link> : null}>
          {active.length === 0 ? (
            <Empty compact icon={Building2} title="No active accounts" text="Add your prop accounts to track balance, targets and drawdown." action={<div className="row-actions"><Link to="/evaluations" className="btn ghost sm"><Plus size={13} /> Evaluation</Link><Link to="/funded" className="btn ghost sm"><Plus size={13} /> Funded</Link></div>} />
          ) : (
            <div className="acct-list">
              {active.slice(0, 6).map((a) => {
                const m = accountMetrics(a)
                return (
                  <Link key={a.id} to={a.kind === 'funded' ? '/funded' : '/evaluations'} className="acct-mini" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="acct-mini-top">
                      <span className={`acct-avatar ${a.kind === 'funded' ? '' : 'v'}`}>{a.kind === 'funded' ? <Landmark size={14} /> : <FlaskConical size={14} />}</span>
                      <div style={{ minWidth: 0 }}>
                        <strong>{a.firm}</strong>
                        <small>{a.label || (a.kind === 'funded' ? 'Funded' : 'Evaluation')}</small>
                      </div>
                      <div className="acct-mini-bal">
                        <strong>{m.bal != null ? money(m.bal) : '—'}</strong>
                        {m.health && <div><span className={`pill tiny ${healthClass(m.health)}`}>{m.health}</span></div>}
                      </div>
                    </div>
                    {m.targetProgress != null && (
                      <div className="mini-meter"><span>Target</span><Bar thin value={m.targetProgress} /><span>{pct(m.targetProgress)}</span></div>
                    )}
                    {m.cushion != null && (
                      <div className="mini-meter"><span>DD buffer</span><Bar thin tone={m.health === 'At risk' ? 'danger' : m.health === 'Caution' ? 'warn' : 'violet'} value={1 - m.ddUsed} /><span>{shortMoney(m.cushion)}</span></div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
        </div>
      </div>

      {/* ---- Discipline + money ---- */}
      <div className="grid three">
        <Card id="discipline" title="Trading discipline" icon={Gauge} action={<button className="btn ghost sm" onClick={() => setEditSettings(true)}><Pencil size={13} /> Limits</button>}>
          {stopTrading ? <div className="stop-banner"><OctagonAlert size={16} /> Limit reached. Step away for today.</div> : null}
          <div className="disc-top">
            <ProgressRing value={(score || 0) / 100} size={96} stroke={9}>
              <span className="ring-value" style={{ fontSize: '1.3rem' }}>{score ?? '—'}</span>
              <span className="ring-sub">score</span>
            </ProgressRing>
            <div className="disc-rows">
              <div className="disc-row"><span>Market prep</span><b>{prepDone}/{prepTotal}</b><Bar value={prepTotal ? prepDone / prepTotal : 0} /></div>
              <div className="disc-row"><span>Trade validation</span><b>{validDone}/{validTotal}</b><Bar tone="violet" value={validTotal ? validDone / validTotal : 0} /></div>
              <div className="disc-row"><span>Followed plan today</span><b>{todays.length ? `${followed}/${todays.length}` : '—'}</b><Bar tone="ok" value={todays.length ? followed / todays.length : 0} /></div>
            </div>
          </div>
          <div className="rule-chips">
            <RuleChip ok={lossOk} label="Loss limit" />
            <RuleChip ok={countOk} label="Max trades" />
            <RuleChip ok={prepTotal > 0 && prepDone === prepTotal} na={!prepTotal} label="Prep done" />
            <RuleChip ok={validTotal > 0 && validDone === validTotal} na={!validTotal || validDone === 0} label={validDone === validTotal && validTotal ? 'Valid setup' : 'Validation'} />
          </div>
          <Expander title="Market prep" icon={ListChecks} meta={`${prepDone}/${prepTotal}`} open={prepOpen} onToggle={setPrepOpen}>
            <ChecklistEditor table={prepItems} checked={prepChecked} onToggle={togglePrep} />
          </Expander>
          <Expander title="Trade validation" icon={BadgeCheck} meta={validDone === validTotal && validTotal ? 'Valid' : `${validTotal - validDone} left`}>
            {validTotal > 0 && (
              <div className={`verdict ${validDone === validTotal ? 'ok' : ''}`}>
                {validDone === validTotal ? 'All checks passed. Valid trade.' : `${validTotal - validDone} check${validTotal - validDone === 1 ? '' : 's'} left before entry`}
              </div>
            )}
            <ChecklistEditor table={validItems} checked={validChecked} onToggle={toggleValid} onReset={() => setValidChecked(new Set())} />
          </Expander>
          <Expander title="Position size" icon={Calculator}>
            <PositionSizer />
          </Expander>
          <Reminders />
        </Card>

        <Card title="Prop firm financials" icon={Wallet} action={<Link to="/finances" className="link-btn">Details <ArrowRight size={13} /></Link>}>
          {fees === 0 && paid === 0 ? (
            <Empty compact icon={Wallet} title="No fees or payouts yet" text="Record what you pay prop firms and what they pay you." action={<Link to="/finances" className="btn ghost sm"><Plus size={13} /> Add fee or payout</Link>} />
          ) : (
            <div className="donut-wrap">
              <Donut
                size={150}
                colors={[C.pink, C.violet]}
                data={[{ name: 'Fees', value: fees }, { name: 'Payouts', value: paid }]}
                center={<><span className={`ring-value ${pnlClass(net)}`} style={{ fontSize: '1.05rem' }}>{signedMoney(net)}</span><span className="ring-sub">net</span></>}
              />
              <div className="split-legend">
                <div><i style={{ background: C.pink }} /> Total fees <strong>{money(fees)}</strong></div>
                <div><i style={{ background: C.violet }} /> Payouts received <strong>{money(paid)}</strong></div>
                <div><i style={{ background: 'transparent', boxShadow: 'inset 0 0 0 1.5px #A6A1B2' }} /> Net prop profit <strong className={pnlClass(net)}>{signedMoney(net)}</strong></div>
                <div><i style={{ background: fees ? C.mint : 'transparent' }} /> Return on fees <strong>{fees ? pct(net / fees) : '—'}</strong></div>
              </div>
            </div>
          )}
          <div className="expander" style={{ padding: '11px 14px' }}>
            <div className="meter-label">
              <span>Brokerage / personal trades</span>
              <b className={pnlClass(brokeragePnl)}>{brokerage.length ? signedMoney(brokeragePnl) : '—'}</b>
            </div>
            <div className="field-hint" style={{ marginTop: 4 }}>
              Journal trades not linked to a prop account{brokerage.length ? ` · ${brokerage.length} trades` : ''}
            </div>
          </div>
        </Card>

        <Card title="Fees vs payouts by firm" icon={Building2}>
          {byFirm.length === 0 ? (
            <Empty compact icon={Building2} title="Nothing to compare yet" text="Each firm’s fees and payouts will appear here side by side." />
          ) : (
            <div style={{ height: Math.max(180, byFirm.length * 56) }}>
              <ResponsiveContainer>
                <BarChart data={byFirm} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barGap={3}>
                  <CartesianGrid horizontal={false} stroke={C.grid} />
                  <XAxis type="number" {...axis} tickFormatter={shortMoney} />
                  <YAxis type="category" dataKey="firm" {...axis} width={80} tick={{ fill: '#A6A1B2', fontSize: 12 }} />
                  <Tooltip {...chartTooltip} formatter={(v, n) => [money(v), n]} />
                  <RBar dataKey="Fees" fill={C.pink} radius={[0, 5, 5, 0]} barSize={10} />
                  <RBar dataKey="Payouts" fill={C.violet} radius={[0, 5, 5, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {logTrade && (
        <FormModal
          title="Log a trade"
          fields={tradeFields(accounts.rows, setups.rows)}
          onSave={(v) => trades.insert(v)}
          onClose={() => setLogTrade(false)}
        />
      )}
      {editSettings && (
        <FormModal
          title="Goals & limits"
          initial={settings}
          fields={[
            { name: 'daily_goal', label: 'Daily profit goal ($)', type: 'number', required: true },
            { name: 'max_daily_loss', label: 'Max daily loss ($)', type: 'number', required: true },
            { name: 'max_trades_per_day', label: 'Max trades per day', type: 'number', required: true },
          ]}
          onSave={save}
          onClose={() => setEditSettings(false)}
        />
      )}
    </div>
  )
}

function RuleChip({ ok, na, label }) {
  return (
    <span className={`rule-chip ${na ? 'na' : ok ? '' : 'off'}`}>
      {na ? <Minus size={12} /> : ok ? <Check size={12} /> : <X size={12} />} {label}
    </span>
  )
}

function ChecklistEditor({ table, checked, onToggle, onReset }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const add = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await table.insert({ label: text.trim(), sort: table.rows.length + 100 })
    setText('')
  }
  return (
    <>
      <ul className="checklist">
        {table.rows.map((i) => (
          <li key={i.id} className={checked.has(i.id) ? 'done' : ''}>
            <button className="check" onClick={() => onToggle(i.id)} aria-pressed={checked.has(i.id)}>
              <span className="box" />
              <span>{i.label}</span>
            </button>
            {editing && <button className="icon-btn sm" onClick={() => table.remove(i.id)} aria-label="Remove step"><X size={13} /></button>}
          </li>
        ))}
      </ul>
      {editing && (
        <form className="inline-add" onSubmit={add}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a step…" />
          <button className="icon-btn" aria-label="Add"><Plus size={16} /></button>
        </form>
      )}
      <div className="row-actions">
        <button className="link-btn" onClick={() => setEditing(!editing)}><Pencil size={12} /> {editing ? 'Done editing' : 'Edit steps'}</button>
        <span className="spacer" />
        {onReset && checked.size > 0 && <button className="link-btn" onClick={onReset}><RotateCcw size={12} /> Reset</button>}
      </div>
    </>
  )
}

function PositionSizer() {
  const [risk, setRisk] = useState('')
  const [stop, setStop] = useState('')
  const [ppv, setPpv] = useState('')
  const contracts = risk && stop && ppv ? Math.floor(Number(risk) / (Number(stop) * Number(ppv))) : null
  return (
    <div className="sizer">
      <label><small>Risk $</small><input type="number" step="any" value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="200" /></label>
      <label><small>Stop (pts)</small><input type="number" step="any" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="10" /></label>
      <label><small>$ / pt</small><input type="number" step="any" value={ppv} onChange={(e) => setPpv(e.target.value)} placeholder="5" /></label>
      <div className="sizer-out">
        <strong>{contracts ?? '—'}</strong>
        <small className="faint">max contracts</small>
      </div>
    </div>
  )
}

function Reminders() {
  const r = useTable('reminders', { ascending: true })
  const [text, setText] = useState('')
  const add = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await r.insert({ text: text.trim() })
    setText('')
  }
  return (
    <Expander title="Reminders" icon={StickyNote} meta={r.rows.length || ''} defaultOpen={r.rows.length > 0}>
      <div className="notes">
        {r.rows.map((n) => (
          <div key={n.id} className="note-card">
            <span>{n.text}</span>
            <button className="icon-btn sm" onClick={() => r.remove(n.id)} aria-label="Remove reminder"><X size={13} /></button>
          </div>
        ))}
      </div>
      <form className="inline-add" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a reminder…" />
        <button className="icon-btn" aria-label="Add"><Plus size={16} /></button>
      </form>
    </Expander>
  )
}
