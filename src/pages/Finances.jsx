import { useMemo, useState } from 'react'
import { Receipt, HandCoins, TrendingUp, Percent, Building2, ChartColumn, PieChart as PieIcon, Table2, Search } from 'lucide-react'
import {
  BarChart, Bar as RBar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { useTable } from '../lib/useTable'
import { money, signedMoney, sum, niceDate, pnlClass, pct, todayISO } from '../lib/format'
import { Card, Toolbar, Stat, Empty, FormModal, ErrorNote, Donut, Seg } from '../components/ui'
import { C, PALETTE, chartTooltip, axis, shortMoney } from './chartTheme'

const CATEGORIES = ['Evaluation fee', 'Reset fee', 'Activation fee', 'Monthly subscription', 'Data feed', 'Platform / software', 'Education', 'Other']

export default function Finances() {
  const expenses = useTable('expenses', { order: 'expense_date' })
  const payouts = useTable('payouts', { order: 'payout_date' })
  const accounts = useTable('accounts')
  const [modal, setModal] = useState(null)
  const [type, setType] = useState('all')
  const [firm, setFirm] = useState('')
  const [q, setQ] = useState('')

  const received = payouts.rows.filter((p) => p.status === 'Received')
  const spent = sum(expenses.rows, 'amount')
  const paid = sum(received, 'amount')
  const net = paid - spent

  const acctOptions = accounts.rows.map((a) => [a.id, `${a.firm}${a.label ? ` · ${a.label}` : ''} (${a.kind})`])
  const firmFromAccount = (v) => {
    const a = accounts.rows.find((x) => x.id === v.account_id)
    return { ...v, firm: v.firm || a?.firm || 'Other' }
  }

  const monthly = useMemo(() => {
    const m = {}
    const add = (date, key, amt) => {
      const k = date.slice(0, 7)
      m[k] = m[k] || { month: k, Fees: 0, Payouts: 0 }
      m[k][key] += Number(amt) || 0
    }
    expenses.rows.forEach((e) => add(e.expense_date, 'Fees', e.amount))
    received.forEach((p) => add(p.payout_date, 'Payouts', p.amount))
    let run = 0
    return Object.values(m)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => {
        run += r.Payouts - r.Fees
        return { ...r, Net: run, label: new Date(r.month + '-15T12:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) }
      })
      .slice(-12)
  }, [expenses.rows, received])

  const byFirm = useMemo(() => {
    const f = {}
    const g = (n) => (f[n] = f[n] || { firm: n, Fees: 0, Payouts: 0 })
    expenses.rows.forEach((e) => (g(e.firm).Fees += Number(e.amount) || 0))
    received.forEach((p) => (g(p.firm).Payouts += Number(p.amount) || 0))
    return Object.values(f).map((x) => ({ ...x, Net: x.Payouts - x.Fees })).sort((a, b) => b.Net - a.Net)
  }, [expenses.rows, received])

  const byCategory = useMemo(() => {
    const m = {}
    expenses.rows.forEach((e) => (m[e.category] = (m[e.category] || 0) + (Number(e.amount) || 0)))
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [expenses.rows])

  const txns = useMemo(() => {
    const list = [
      ...expenses.rows.map((r) => ({ ...r, _type: 'expense', _date: r.expense_date, _what: r.category, _amt: -Number(r.amount) })),
      ...payouts.rows.map((r) => ({ ...r, _type: 'payout', _date: r.payout_date, _what: `Payout · ${r.status}`, _amt: Number(r.amount) })),
    ]
    const s = q.trim().toLowerCase()
    return list
      .filter((r) => type === 'all' || r._type === type)
      .filter((r) => !firm || r.firm === firm)
      .filter((r) => !s || [r.firm, r._what, r.notes].join(' ').toLowerCase().includes(s))
      .sort((a, b) => b._date.localeCompare(a._date))
  }, [expenses.rows, payouts.rows, type, firm, q])

  const firms = [...new Set([...expenses.rows, ...payouts.rows].map((r) => r.firm))].sort()

  const expenseFields = [
    { name: 'firm', label: 'Prop firm', placeholder: 'Blank = use the account’s firm' },
    { name: 'account_id', label: 'Account (optional)', type: 'select', options: acctOptions },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, required: true, default: 'Evaluation fee' },
    { name: 'amount', label: 'Amount ($)', type: 'number', required: true },
    { name: 'expense_date', label: 'Date', type: 'date', required: true, default: todayISO() },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
  const payoutFields = [
    { name: 'firm', label: 'Prop firm', placeholder: 'Blank = use the account’s firm' },
    { name: 'account_id', label: 'Account (optional)', type: 'select', options: acctOptions },
    { name: 'amount', label: 'Amount ($)', type: 'number', required: true },
    { name: 'payout_date', label: 'Date', type: 'date', required: true, default: todayISO() },
    { name: 'status', label: 'Status', type: 'select', options: ['Received', 'Requested', 'Denied'], required: true, default: 'Received' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
  const table = modal?.type === 'expense' ? expenses : payouts
  const empty = !expenses.rows.length && !payouts.rows.length

  return (
    <div className="page">
      <div className="stats-row">
        <Stat icon={Receipt} label="Total fees" value={money(spent)} tone={spent ? 'neg' : ''} hint={`${expenses.rows.length} expenses`} />
        <Stat icon={HandCoins} label="Payouts received" value={money(paid)} tone={paid ? 'pos' : ''} hint={`${received.length} payouts`} />
        <Stat icon={TrendingUp} label="Net profitability" value={signedMoney(net)} tone={pnlClass(net)} />
        <Stat icon={Percent} label="Return on fees" value={spent ? pct(net / spent) : '—'} hint={spent ? 'Net ÷ fees' : 'Needs at least one fee'} />
      </div>

      <Toolbar
        actions={
          <>
            <button className="btn ghost" onClick={() => setModal({ type: 'expense' })}><Receipt size={15} /> Add fee</button>
            <button className="btn" onClick={() => setModal({ type: 'payout' })}><HandCoins size={15} /> Add payout</button>
          </>
        }
      />
      <ErrorNote error={expenses.error || payouts.error} />

      {empty ? (
        <Card>
          <Empty icon={Receipt} title="No fees or payouts yet" text="Add your evaluation fees, resets and payouts. Charts and comparisons build themselves from them." />
        </Card>
      ) : (
        <>
          <div className="grid two">
            <Card title="Fees vs payouts" icon={ChartColumn}>
              <div style={{ height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={monthly} barGap={3} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis {...axis} width={48} tickFormatter={shortMoney} />
                    <Tooltip {...chartTooltip} formatter={(v, n) => [money(v), n]} />
                    <RBar dataKey="Fees" fill={C.pink} radius={[5, 5, 0, 0]} maxBarSize={22} />
                    <RBar dataKey="Payouts" fill={C.violet} radius={[5, 5, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Net profitability trend" icon={TrendingUp}>
              <div style={{ height: 250 }}>
                <ResponsiveContainer>
                  <AreaChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="netFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor={C.orchid} stopOpacity={0.4} />
                        <stop offset="1" stopColor={C.orchid} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis {...axis} width={48} tickFormatter={shortMoney} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                    <Tooltip {...chartTooltip} formatter={(v) => [signedMoney(v), 'Running net']} />
                    <Area type="monotone" dataKey="Net" stroke={C.orchid} strokeWidth={2.5} fill="url(#netFill)" dot={{ r: 3, fill: C.orchid, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid two">
            <Card title="Prop firm comparison" icon={Building2}>
              <div style={{ height: Math.max(170, byFirm.length * 54) }}>
                <ResponsiveContainer>
                  <BarChart data={byFirm} layout="vertical" barGap={3} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid horizontal={false} stroke={C.grid} />
                    <XAxis type="number" {...axis} tickFormatter={shortMoney} />
                    <YAxis type="category" dataKey="firm" {...axis} width={90} tick={{ fill: '#A6A1B2', fontSize: 12 }} />
                    <Tooltip {...chartTooltip} formatter={(v, n) => [money(v), n]} />
                    <RBar dataKey="Fees" fill={C.pink} radius={[0, 5, 5, 0]} barSize={10} />
                    <RBar dataKey="Payouts" fill={C.violet} radius={[0, 5, 5, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Where fees go" icon={PieIcon}>
              {byCategory.length === 0 ? (
                <Empty compact icon={PieIcon} title="No fees yet" />
              ) : (
                <div className="donut-wrap">
                  <Donut size={160} colors={PALETTE} data={byCategory} center={<><span className="ring-value">{money(spent)}</span><span className="ring-sub">total fees</span></>} />
                  <div className="split-legend">
                    {byCategory.map((c, i) => (
                      <div key={c.name}><i style={{ background: PALETTE[i % PALETTE.length] }} /> {c.name} <strong>{money(c.value)}</strong></div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card title="Transactions" icon={Table2}>
            <Toolbar>
              <Seg value={type} onChange={setType} options={[['all', 'All'], ['expense', 'Fees'], ['payout', 'Payouts']]} />
              <select className="mini-select" value={firm} onChange={(e) => setFirm(e.target.value)} aria-label="Filter by firm">
                <option value="">All firms</option>
                {firms.map((f) => <option key={f}>{f}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <Search size={13} className="faint" style={{ position: 'absolute', left: 9, top: 9 }} />
                <input className="mini-input" style={{ paddingLeft: 28 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search transactions" />
              </div>
            </Toolbar>
            {txns.length === 0 ? (
              <p className="muted small">No matching transactions.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Date</th><th>Firm</th><th>Type</th><th className="num">Amount</th></tr></thead>
                  <tbody>
                    {txns.map((r) => (
                      <tr key={r._type + r.id} className="click" onClick={() => setModal({ type: r._type, row: r })}>
                        <td className="muted">{niceDate(r._date)}</td>
                        <td>{r.firm}</td>
                        <td>
                          <span className={`pill tiny ${r._type === 'payout' ? r.status.toLowerCase() : 'failed'}`}>{r._type === 'payout' ? r.status : 'Fee'}</span>{' '}
                          <span className="faint">{r._type === 'expense' ? r.category : ''}</span>
                        </td>
                        <td className={`num ${r._type === 'payout' ? (r.status === 'Received' ? 'pos' : 'muted') : 'neg'}`}>
                          {r._amt >= 0 ? '+' : '−'}{money(Math.abs(r._amt), { cents: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {modal && (
        <FormModal
          title={`${modal.row ? 'Edit' : 'Add'} ${modal.type === 'expense' ? 'fee' : 'payout'}`}
          fields={modal.type === 'expense' ? expenseFields : payoutFields}
          initial={modal.row}
          onSave={(v) => (modal.row ? table.update(modal.row.id, firmFromAccount(v)) : table.insert(firmFromAccount(v)))}
          onDelete={modal.row && (() => table.remove(modal.row.id))}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
