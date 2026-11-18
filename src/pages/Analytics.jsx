import { useMemo, useState } from 'react'
import { Sprout, Percent, Scale, TrendingUp, TrendingDown, HeartHandshake, ChartSpline, CalendarRange, BookOpenText, Smile } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar as RBar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useTable } from '../lib/useTable'
import { money, signedMoney, sum, pct, pnlClass, todayISO } from '../lib/format'
import { Card, PageHeader, Stat, Empty, Loading, ErrorNote } from '../components/ui'
import { Bamboo } from '../components/Botanicals'
import { chartTooltip } from './chartTheme'

const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['all', 'All time']]
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Analytics() {
  const trades = useTable('trades', { order: 'trade_date', ascending: true })
  const setups = useTable('playbook_setups')
  const accounts = useTable('accounts')
  const [range, setRange] = useState('30')
  const [acct, setAcct] = useState('')

  const rows = useMemo(() => {
    let r = trades.rows
    if (acct) r = r.filter((t) => t.account_id === acct)
    if (range !== 'all') {
      const d = new Date(todayISO() + 'T12:00:00')
      d.setDate(d.getDate() - Number(range) + 1)
      const from = d.toISOString().slice(0, 10)
      r = r.filter((t) => t.trade_date >= from)
    }
    return r
  }, [trades.rows, range, acct])

  const s = useMemo(() => {
    const wins = rows.filter((t) => Number(t.pnl) > 0)
    const losses = rows.filter((t) => Number(t.pnl) < 0)
    const gw = sum(wins, 'pnl')
    const gl = Math.abs(sum(losses, 'pnl'))
    const plan = rows.filter((t) => t.followed_plan)
    const days = {}
    rows.forEach((t) => (days[t.trade_date] = (days[t.trade_date] || 0) + Number(t.pnl)))
    const dayVals = Object.values(days)
    return {
      net: sum(rows, 'pnl'),
      winRate: rows.length ? wins.length / rows.length : null,
      pf: gl ? gw / gl : gw ? Infinity : null,
      avgWin: wins.length ? gw / wins.length : 0,
      avgLoss: losses.length ? gl / losses.length : 0,
      expectancy: rows.length ? sum(rows, 'pnl') / rows.length : 0,
      adherence: rows.length ? plan.length / rows.length : null,
      planPnl: sum(plan, 'pnl'),
      offPlanPnl: sum(rows.filter((t) => !t.followed_plan), 'pnl'),
      greenDays: dayVals.filter((v) => v > 0).length,
      tradingDays: dayVals.length,
      bestDay: dayVals.length ? Math.max(...dayVals) : 0,
      worstDay: dayVals.length ? Math.min(...dayVals) : 0,
    }
  }, [rows])

  const equity = useMemo(() => {
    const byDay = {}
    rows.forEach((t) => (byDay[t.trade_date] = (byDay[t.trade_date] || 0) + Number(t.pnl)))
    let run = 0
    return Object.keys(byDay).sort().map((d) => {
      run += byDay[d]
      return { date: new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), equity: run }
    })
  }, [rows])

  const byDow = useMemo(() => {
    const b = DOW.map((d) => ({ name: d, pnl: 0 }))
    rows.forEach((t) => (b[new Date(t.trade_date + 'T12:00:00').getDay()].pnl += Number(t.pnl)))
    return b.slice(1, 6)
  }, [rows])

  const bySetup = useMemo(() => {
    const m = {}
    rows.forEach((t) => {
      const n = setups.rows.find((x) => x.id === t.setup_id)?.name || 'No setup'
      m[n] = m[n] || { name: n, pnl: 0, n: 0 }
      m[n].pnl += Number(t.pnl)
      m[n].n++
    })
    return Object.values(m).sort((a, b) => b.pnl - a.pnl)
  }, [rows, setups.rows])

  const byMood = useMemo(() => {
    const m = {}
    rows.filter((t) => t.mood).forEach((t) => {
      m[t.mood] = m[t.mood] || { name: t.mood, pnl: 0, n: 0 }
      m[t.mood].pnl += Number(t.pnl)
      m[t.mood].n++
    })
    return Object.values(m).sort((a, b) => b.pnl - a.pnl)
  }, [rows])

  return (
    <div className="page">
      <PageHeader title="Performance analytics" subtitle="Patterns that help your garden grow" art={<Bamboo />}>
        <select className="mini-select" value={acct} onChange={(e) => setAcct(e.target.value)} aria-label="Filter by account">
          <option value="">All accounts</option>
          {accounts.rows.map((a) => <option key={a.id} value={a.id}>{a.firm}{a.label ? ` · ${a.label}` : ''}</option>)}
        </select>
      </PageHeader>
      <div className="chips">
        {RANGES.map(([v, l]) => (
          <button key={v} className={`chip ${range === v ? 'on' : ''}`} onClick={() => setRange(v)}>{l}</button>
        ))}
      </div>
      <ErrorNote error={trades.error} />

      {trades.loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty title="No trades in this range" text="Analytics bloom once you log real trades in your journal." />
      ) : (
        <>
          <div className="stats-row">
            <Stat icon={Sprout} label="Net P&L" value={signedMoney(s.net)} tone={pnlClass(s.net)} hint={`${rows.length} trades`} />
            <Stat icon={Percent} label="Win rate" value={pct(s.winRate)} hint={`${s.greenDays}/${s.tradingDays} green days`} />
            <Stat icon={Scale} label="Profit factor" value={s.pf === Infinity ? '∞' : s.pf ? s.pf.toFixed(2) : '—'} hint={`Avg/trade ${signedMoney(s.expectancy)}`} />
            <Stat icon={HeartHandshake} label="Plan adherence" value={s.adherence == null ? '—' : pct(s.adherence)} tone={s.adherence >= 0.8 ? 'pos' : s.adherence < 0.6 ? 'neg' : ''} />
          </div>
          <div className="stats-row">
            <Stat icon={TrendingUp} label="Avg win" value={money(s.avgWin)} tone="pos" />
            <Stat icon={TrendingDown} label="Avg loss" value={money(s.avgLoss)} tone="neg" />
            <Stat icon={TrendingUp} label="Best day" value={signedMoney(s.bestDay)} tone={pnlClass(s.bestDay)} />
            <Stat icon={TrendingDown} label="Worst day" value={signedMoney(s.worstDay)} tone={pnlClass(s.worstDay)} />
          </div>

          <Card title="Equity curve" icon={ChartSpline}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={equity}>
                <defs>
                  <linearGradient id="eq" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="var(--leaf)" stopOpacity=".45" />
                    <stop offset="1" stopColor="var(--leaf)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} minTickGap={20} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} tickFormatter={(v) => money(v)} />
                <Tooltip {...chartTooltip} formatter={(v) => [signedMoney(v), 'Cumulative']} />
                <Area type="monotone" dataKey="equity" stroke="var(--leaf-dark)" strokeWidth={2.5} fill="url(#eq)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid two">
            <Card title="By weekday" icon={CalendarRange}>
              <PnlBars data={byDow} />
            </Card>
            <Card title="Rules vs. impulse" icon={HeartHandshake}>
              <PnlBars data={[{ name: 'Followed plan', pnl: s.planPnl }, { name: 'Broke plan', pnl: s.offPlanPnl }]} />
            </Card>
            <Card title="By playbook setup" icon={BookOpenText}>
              <PnlBars data={bySetup} horizontal />
            </Card>
            <Card title="By mood" icon={Smile}>
              {byMood.length ? <PnlBars data={byMood} horizontal /> : <p className="muted small">Add “How I felt” to trades to see this.</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function PnlBars({ data, horizontal }) {
  const h = horizontal ? Math.max(160, data.length * 40) : 220
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
        <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke="var(--line)" />
        {horizontal ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => money(v)} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} tickFormatter={(v) => money(v)} />
          </>
        )}
        <Tooltip {...chartTooltip} formatter={(v) => [signedMoney(v), 'P&L']} />
        <RBar dataKey="pnl" radius={horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? 'var(--leaf)' : 'var(--sakura-dark)'} />)}
        </RBar>
      </BarChart>
    </ResponsiveContainer>
  )
}
