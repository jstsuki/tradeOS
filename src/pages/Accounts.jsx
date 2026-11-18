import { useState } from 'react'
import { Plus, Pencil, Sprout, Trophy, Flag, ShieldAlert, HandCoins, CircleCheck, CircleX, Layers } from 'lucide-react'
import { useTable } from '../lib/useTable'
import { money, signedMoney, sum, niceDate, pnlClass, pct, todayISO } from '../lib/format'
import { Card, PageHeader, Stat, Bar, Empty, FormModal, Loading, ErrorNote } from '../components/ui'
import { MatchaSprig, Bamboo } from '../components/Botanicals'

const STATUS = {
  evaluation: ['Active', 'Passed', 'Failed', 'Paused'],
  funded: ['Active', 'Payout pending', 'Breached', 'Closed'],
}

const accountFields = (kind) => [
  { name: 'firm', label: 'Prop firm', required: true, placeholder: 'e.g. Topstep' },
  { name: 'label', label: 'Nickname / account #', placeholder: 'e.g. 50K #2' },
  { name: 'account_size', label: 'Account size ($)', type: 'number' },
  { name: 'current_balance', label: 'Current balance ($)', type: 'number' },
  ...(kind === 'evaluation' ? [{ name: 'profit_target', label: 'Profit target ($)', type: 'number' }] : []),
  { name: 'max_drawdown', label: 'Max drawdown ($)', type: 'number' },
  { name: 'daily_loss_limit', label: 'Daily loss limit ($)', type: 'number' },
  { name: 'drawdown_type', label: 'Drawdown type', type: 'select', options: ['Trailing (EOD)', 'Trailing (intraday)', 'Static'] },
  { name: 'status', label: 'Status', type: 'select', options: STATUS[kind], required: true, default: 'Active' },
  { name: 'start_date', label: 'Start date', type: 'date', default: todayISO() },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

const payoutFields = [
  { name: 'amount', label: 'Amount ($)', type: 'number', required: true },
  { name: 'payout_date', label: 'Date', type: 'date', required: true, default: todayISO() },
  { name: 'status', label: 'Status', type: 'select', options: ['Received', 'Requested', 'Denied'], required: true, default: 'Received' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
]

export default function Accounts({ kind }) {
  const isEval = kind === 'evaluation'
  const accounts = useTable('accounts', { eq: { kind } })
  const trades = useTable('trades')
  const payouts = useTable('payouts', { order: 'payout_date' })
  const [filter, setFilter] = useState('All')
  const [modal, setModal] = useState(null) // { type: 'account'|'payout', row?, account? }

  const rows = accounts.rows.filter((a) => filter === 'All' || a.status === filter)
  const count = (s) => accounts.rows.filter((a) => a.status === s).length
  const closedEvals = count('Passed') + count('Failed')
  const myPayouts = payouts.rows.filter((p) => accounts.rows.some((a) => a.id === p.account_id))
  const received = sum(myPayouts.filter((p) => p.status === 'Received'), 'amount')
  const activeBal = sum(accounts.rows.filter((a) => a.status === 'Active'), 'current_balance')

  return (
    <div className="page">
      <PageHeader
        title={isEval ? 'Evaluation accounts' : 'Funded accounts'}
        subtitle={isEval ? 'Every challenge, from seedling to pass' : 'Your funded garden and its harvests'}
        art={isEval ? <MatchaSprig /> : <Bamboo />}
      >
        <button className="btn" onClick={() => setModal({ type: 'account' })}>
          <Plus size={16} /> Add account
        </button>
      </PageHeader>

      <div className="stats-row">
        {isEval ? (
          <>
            <Stat icon={Sprout} label="Active" value={count('Active')} />
            <Stat icon={CircleCheck} label="Passed" value={count('Passed')} tone="pos" />
            <Stat icon={CircleX} label="Failed" value={count('Failed')} tone={count('Failed') ? 'neg' : ''} />
            <Stat icon={Flag} label="Pass rate" value={closedEvals ? pct(count('Passed') / closedEvals) : '—'} />
          </>
        ) : (
          <>
            <Stat icon={Trophy} label="Active" value={count('Active')} />
            <Stat icon={Layers} label="Active balance" value={money(activeBal)} />
            <Stat icon={HandCoins} label="Payouts received" value={money(received)} tone="pos" />
            <Stat icon={ShieldAlert} label="Breached" value={count('Breached')} tone={count('Breached') ? 'neg' : ''} />
          </>
        )}
      </div>

      <div className="chips">
        {['All', ...STATUS[kind]].map((s) => (
          <button key={s} className={`chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      <ErrorNote error={accounts.error} />
      {accounts.loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty
          title={accounts.rows.length ? 'Nothing with this status' : 'No accounts yet'}
          text={accounts.rows.length ? null : `Add your first ${isEval ? 'evaluation' : 'funded'} account to start tracking it.`}
          action={!accounts.rows.length && <button className="btn" onClick={() => setModal({ type: 'account' })}><Plus size={16} /> Add account</button>}
        />
      ) : (
        <div className="grid cards">
          {rows.map((a) => (
            <AccountCard
              key={a.id}
              a={a}
              isEval={isEval}
              trades={trades.rows.filter((t) => t.account_id === a.id)}
              payouts={payouts.rows.filter((p) => p.account_id === a.id)}
              onEdit={() => setModal({ type: 'account', row: a })}
              onPayout={(row) => setModal({ type: 'payout', account: a, row })}
            />
          ))}
        </div>
      )}

      {modal?.type === 'account' && (
        <FormModal
          title={modal.row ? 'Edit account' : `New ${isEval ? 'evaluation' : 'funded'} account`}
          fields={accountFields(kind)}
          initial={modal.row}
          onSave={(v) => (modal.row ? accounts.update(modal.row.id, v) : accounts.insert(v))}
          onDelete={modal.row && (() => accounts.remove(modal.row.id))}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'payout' && (
        <FormModal
          title={`${modal.row ? 'Edit' : 'Add'} payout · ${modal.account.firm}`}
          fields={payoutFields}
          initial={modal.row}
          onSave={(v) =>
            modal.row
              ? payouts.update(modal.row.id, v)
              : payouts.insert({ ...v, account_id: modal.account.id, firm: modal.account.firm })
          }
          onDelete={modal.row && (() => payouts.remove(modal.row.id))}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function AccountCard({ a, isEval, trades, payouts, onEdit, onPayout }) {
  const size = Number(a.account_size) || 0
  const bal = a.current_balance == null ? null : Number(a.current_balance)
  const profit = bal != null && size ? bal - size : null
  const target = Number(a.profit_target) || 0
  const dd = Number(a.max_drawdown) || 0
  const cushion = bal != null && size && dd ? bal - (size - dd) : null
  const journalPnl = sum(trades, 'pnl')
  const wins = trades.filter((t) => Number(t.pnl) > 0).length
  const statusClass = a.status.toLowerCase().replace(/\s+/g, '-')
  const paid = sum(payouts.filter((p) => p.status === 'Received'), 'amount')

  return (
    <Card className="account-card">
      <div className="acct-top">
        <div className="acct-avatar">{a.firm.slice(0, 1).toUpperCase()}</div>
        <div className="acct-title">
          <strong>{a.firm}</strong>
          <small>{[a.label, size ? money(size) : null].filter(Boolean).join(' · ') || '—'}</small>
        </div>
        <span className={`pill ${statusClass}`}>{a.status}</span>
        <button className="icon-btn" onClick={onEdit} aria-label="Edit account"><Pencil size={15} /></button>
      </div>

      <div className="acct-balance">
        <div>
          <small>Balance</small>
          <strong>{bal != null ? money(bal, { cents: true }) : '—'}</strong>
        </div>
        <div>
          <small>Profit</small>
          <strong className={pnlClass(profit)}>{profit != null ? signedMoney(profit) : '—'}</strong>
        </div>
      </div>

      {isEval && target > 0 && (
        <div className="meter">
          <div className="meter-label"><span><Flag size={13} /> Profit target</span><span>{profit != null ? pct(Math.max(profit, 0) / target) : '—'} of {money(target)}</span></div>
          <Bar value={profit != null ? profit / target : 0} />
        </div>
      )}
      {dd > 0 && (
        <div className="meter">
          <div className="meter-label"><span><ShieldAlert size={13} /> Drawdown cushion</span><span>{cushion != null ? money(cushion) : '—'} left</span></div>
          <Bar value={cushion != null ? 1 - cushion / dd : 0} tone={cushion != null && cushion / dd < 0.3 ? 'danger' : cushion != null && cushion / dd < 0.6 ? 'warn' : ''} />
        </div>
      )}

      <div className="acct-foot">
        <span>{trades.length} trades · {trades.length ? pct(wins / trades.length) : '—'} win</span>
        <span className={pnlClass(journalPnl)}>{trades.length ? signedMoney(journalPnl) : ''}</span>
      </div>

      {!isEval && (
        <div className="payouts">
          <div className="meter-label">
            <span><HandCoins size={13} /> Payouts · {money(paid)}</span>
            <button className="link-btn" onClick={() => onPayout(null)}><Plus size={13} /> Add</button>
          </div>
          {payouts.slice(0, 4).map((p) => (
            <button key={p.id} className="payout-row" onClick={() => onPayout(p)}>
              <span>{niceDate(p.payout_date)}</span>
              <span className={`pill tiny ${p.status.toLowerCase()}`}>{p.status}</span>
              <strong>{money(p.amount, { cents: true })}</strong>
            </button>
          ))}
        </div>
      )}
      {a.start_date && <small className="muted">Started {niceDate(a.start_date)}</small>}
    </Card>
  )
}
