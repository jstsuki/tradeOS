import { useMemo, useState } from 'react'
import { Plus, Receipt, HandCoins, Sprout, Percent, Building2 } from 'lucide-react'
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useTable } from '../lib/useTable'
import { money, signedMoney, sum, niceDate, pnlClass, pct, todayISO } from '../lib/format'
import { Card, PageHeader, Stat, Empty, FormModal, ErrorNote } from '../components/ui'
import { MatchaBowl } from '../components/Botanicals'
import { chartTooltip } from './chartTheme'

const CATEGORIES = ['Evaluation fee', 'Reset fee', 'Activation fee', 'Monthly subscription', 'Data feed', 'Platform / software', 'Education', 'Other']

export default function Finances() {
  const expenses = useTable('expenses', { order: 'expense_date' })
  const payouts = useTable('payouts', { order: 'payout_date' })
  const accounts = useTable('accounts')
  const [modal, setModal] = useState(null)

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
      m[k] = m[k] || { month: k, Expenses: 0, Payouts: 0 }
      m[k][key] += Number(amt) || 0
    }
    expenses.rows.forEach((e) => add(e.expense_date, 'Expenses', e.amount))
    received.forEach((p) => add(p.payout_date, 'Payouts', p.amount))
    return Object.values(m)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map((r) => ({ ...r, label: new Date(r.month + '-15').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) }))
  }, [expenses.rows, received])

  const byFirm = useMemo(() => {
    const f = {}
    const get = (n) => (f[n] = f[n] || { firm: n, spent: 0, paid: 0 })
    expenses.rows.forEach((e) => (get(e.firm).spent += Number(e.amount) || 0))
    received.forEach((p) => (get(p.firm).paid += Number(p.amount) || 0))
    return Object.values(f).sort((a, b) => b.paid - b.spent - (a.paid - a.spent))
  }, [expenses.rows, received])

  const expenseFields = [
    { name: 'firm', label: 'Prop firm', placeholder: 'Leave blank to use the account’s firm' },
    { name: 'account_id', label: 'Account (optional)', type: 'select', options: acctOptions },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, required: true, default: 'Evaluation fee' },
    { name: 'amount', label: 'Amount ($)', type: 'number', required: true },
    { name: 'expense_date', label: 'Date', type: 'date', required: true, default: todayISO() },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
  const payoutFields = [
    { name: 'firm', label: 'Prop firm', placeholder: 'Leave blank to use the account’s firm' },
    { name: 'account_id', label: 'Account (optional)', type: 'select', options: acctOptions },
    { name: 'amount', label: 'Amount ($)', type: 'number', required: true },
    { name: 'payout_date', label: 'Date', type: 'date', required: true, default: todayISO() },
    { name: 'status', label: 'Status', type: 'select', options: ['Received', 'Requested', 'Denied'], required: true, default: 'Received' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]

  const table = modal?.type === 'expense' ? expenses : payouts

  return (
    <div className="page">
      <PageHeader title="Prop firm finances" subtitle="What you’ve planted, and what you’ve harvested" art={<MatchaBowl />}>
        <button className="btn ghost" onClick={() => setModal({ type: 'expense' })}><Receipt size={16} /> Add expense</button>
        <button className="btn" onClick={() => setModal({ type: 'payout' })}><HandCoins size={16} /> Add payout</button>
      </PageHeader>

      <div className="stats-row">
        <Stat icon={Receipt} label="Total spent" value={money(spent)} />
        <Stat icon={HandCoins} label="Payouts received" value={money(paid)} tone="pos" />
        <Stat icon={Sprout} label="Net profit" value={signedMoney(net)} tone={pnlClass(net)} />
        <Stat icon={Percent} label="Return on fees" value={spent ? pct(net / spent) : '—'} />
      </div>
      <ErrorNote error={expenses.error || payouts.error} />

      <div className="grid two">
        <Card title="Month by month" icon={Sprout}>
          {monthly.length === 0 ? (
            <Empty title="No money moves yet" text="Expenses and payouts you add will grow into a chart here." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} width={48} />
                <Tooltip {...chartTooltip} formatter={(v) => money(v)} />
                <Legend iconType="circle" />
                <RBar dataKey="Expenses" fill="var(--sakura-dark)" radius={[6, 6, 0, 0]} />
                <RBar dataKey="Payouts" fill="var(--leaf)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="By prop firm" icon={Building2}>
          {byFirm.length === 0 ? (
            <Empty title="No firms yet" />
          ) : (
            <table className="table">
              <thead><tr><th>Firm</th><th>Spent</th><th>Paid out</th><th>Net</th></tr></thead>
              <tbody>
                {byFirm.map((f) => (
                  <tr key={f.firm}>
                    <td>{f.firm}</td>
                    <td>{money(f.spent)}</td>
                    <td>{money(f.paid)}</td>
                    <td className={pnlClass(f.paid - f.spent)}>{signedMoney(f.paid - f.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <div className="grid two">
        <Card title="Expenses" icon={Receipt} action={<button className="link-btn" onClick={() => setModal({ type: 'expense' })}><Plus size={14} /> Add</button>}>
          <Ledger rows={expenses.rows} date="expense_date" sub="category" onPick={(row) => setModal({ type: 'expense', row })} />
        </Card>
        <Card title="Payouts" icon={HandCoins} action={<button className="link-btn" onClick={() => setModal({ type: 'payout' })}><Plus size={14} /> Add</button>}>
          <Ledger rows={payouts.rows} date="payout_date" sub="status" positive onPick={(row) => setModal({ type: 'payout', row })} />
        </Card>
      </div>

      {modal && (
        <FormModal
          title={`${modal.row ? 'Edit' : 'Add'} ${modal.type}`}
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

function Ledger({ rows, date, sub, positive, onPick }) {
  if (!rows.length) return <p className="muted small">Nothing here yet.</p>
  return (
    <div className="ledger">
      {rows.map((r) => (
        <button key={r.id} className="ledger-row" onClick={() => onPick(r)}>
          <div>
            <strong>{r.firm}</strong>
            <small>{niceDate(r[date])} · {r[sub]}</small>
          </div>
          <span className={positive ? (r.status === 'Received' ? 'pos' : 'muted') : 'neg'}>
            {positive ? '+' : '−'}{money(r.amount, { cents: true })}
          </span>
        </button>
      ))}
    </div>
  )
}
