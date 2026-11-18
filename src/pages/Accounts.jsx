import { useState } from 'react'
import {
  Plus, Pencil, FlaskConical, Landmark, Flag, ShieldHalf, HandCoins, CircleCheck, CircleX, Layers, CalendarDays, HeartPulse, Target, RefreshCw,
} from 'lucide-react'
import { useTable } from '../lib/useTable'
import { PROP_FIRMS } from '../lib/firms'
import { money, signedMoney, sum, niceDate, pnlClass, pct, todayISO } from '../lib/format'
import { accountMetrics, healthClass, FUNDED_BUFFER } from '../lib/metrics'
import { Card, Toolbar, Stat, Bar, Empty, FormModal, Loading, ErrorNote, ProgressRing } from '../components/ui'

const STATUS = {
  evaluation: ['Active', 'Passed', 'Failed', 'Paused'],
  funded: ['Active', 'Payout pending', 'Breached', 'Closed'],
}

// Evaluation presets: picking a size fills in its profit target and max drawdown.
const EVAL_SIZES = {
  25000: { profit_target: 1250, max_drawdown: 1000 },
  50000: { profit_target: 3000, max_drawdown: 2000 },
}
const EVAL_NICKNAMES = [1, 2, 3, 4, 5].map((n) => `LucidMaxx 50K #${n}`)

const EOD_FIRMS = ['Lucid', 'Tradeify']

const accountFields = (kind) => [
  {
    name: 'firm', label: 'Prop firm', type: 'select', options: PROP_FIRMS, required: true, default: PROP_FIRMS[0],
    // Lucid and Tradeify: trailing end-of-day drawdown and no daily loss limit.
    onPick: (v) => (EOD_FIRMS.includes(v) ? { drawdown_type: 'Trailing (EOD)', daily_loss_limit: '' } : {}),
  },
  kind === 'evaluation'
    ? { name: 'label', label: 'Nickname / account #', type: 'select', options: EVAL_NICKNAMES }
    : { name: 'label', label: 'Nickname / account #', placeholder: 'e.g. 50K #2' },
  kind === 'evaluation'
    ? {
        name: 'account_size', label: 'Account size ($)', type: 'select', numeric: true,
        options: Object.keys(EVAL_SIZES).map((v) => [Number(v), '$' + Number(v).toLocaleString('en-US')]),
        hint: 'Fills in the profit target and max drawdown',
        onPick: (v) => EVAL_SIZES[Number(v)] || {},
      }
    : {
        name: 'account_size', label: 'Account size ($)', type: 'number',
        hint: '25K starts with a $1,000 buffer, 50K with $2,000',
        onPick: (v) => (FUNDED_BUFFER[Number(v)] ? { max_drawdown: FUNDED_BUFFER[Number(v)] } : {}),
      },
  { name: 'current_balance', label: 'Current balance ($)', type: 'number' },
  kind === 'evaluation'
    ? { name: 'profit_target', label: 'Profit target ($)', type: 'number' }
    : { name: 'profit_target', label: 'Next payout target ($)', type: 'number', hint: 'Profit needed before you can request a payout' },
  { name: 'max_drawdown', label: 'Max drawdown ($)', type: 'number' },
  { name: 'daily_loss_limit', label: 'Daily loss limit ($)', type: 'number', placeholder: 'None' },
  { name: 'drawdown_type', label: 'Drawdown type', type: 'select', options: ['Trailing (EOD)', 'Trailing (intraday)', 'Static'] },
  { name: 'status', label: 'Status', type: 'select', options: STATUS[kind], required: true, default: 'Active' },
  { name: 'start_date', label: 'Start date', type: 'date', default: todayISO() },
  ...(kind === 'evaluation' ? [] : [{ name: 'notes', label: 'Notes', type: 'textarea' }]),
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
  const [modal, setModal] = useState(null)

  const rows = accounts.rows.filter((a) => filter === 'All' || a.status === filter)
  const count = (s) => accounts.rows.filter((a) => a.status === s).length
  const closedEvals = count('Passed') + count('Failed')
  const myPayouts = payouts.rows.filter((p) => accounts.rows.some((a) => a.id === p.account_id))
  const received = sum(myPayouts.filter((p) => p.status === 'Received'), 'amount')
  const activeRows = accounts.rows.filter((a) => a.status === 'Active')
  const activeBal = sum(activeRows, 'current_balance')

  return (
    <div className="page">
      <div className="stats-row">
        {isEval ? (
          <>
            <Stat icon={FlaskConical} label="Active" value={count('Active')} />
            <Stat icon={CircleCheck} label="Passed" value={count('Passed')} tone={count('Passed') ? 'pos' : ''} />
            <Stat icon={CircleX} label="Failed" value={count('Failed')} tone={count('Failed') ? 'neg' : ''} />
            <Stat icon={Flag} label="Pass rate" value={closedEvals ? pct(count('Passed') / closedEvals) : '—'} hint={closedEvals ? `${closedEvals} finished` : 'No finished evaluations yet'} />
          </>
        ) : (
          <>
            <Stat icon={Landmark} label="Active accounts" value={count('Active')} />
            <Stat icon={Layers} label="Active balance" value={money(activeBal)} />
            <Stat icon={HandCoins} label="Payouts received" value={money(received)} tone={received ? 'pos' : ''} hint={`${myPayouts.filter((p) => p.status === 'Received').length} payouts`} />
            <Stat icon={HeartPulse} label="Needs attention" value={activeRows.filter((a) => accountMetrics(a).health === 'At risk').length + count('Breached')} tone={count('Breached') ? 'neg' : ''} hint="At risk or breached" />
          </>
        )}
      </div>

      <Toolbar
        actions={
          <button className="btn" onClick={() => setModal({ type: 'account' })}>
            <Plus size={15} /> Add account
          </button>
        }
      >
        <div className="chips">
          {['All', ...STATUS[kind]].map((s) => (
            <button key={s} className={`chip ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
              {s} <span className="faint">{s === 'All' ? accounts.rows.length : count(s)}</span>
            </button>
          ))}
        </div>
      </Toolbar>

      <ErrorNote error={accounts.error} />
      {accounts.loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <Empty
            icon={isEval ? FlaskConical : Landmark}
            title={accounts.rows.length ? 'Nothing with this status' : 'No accounts yet'}
            text={accounts.rows.length ? null : `Add your first ${isEval ? 'evaluation' : 'funded'} account to track its progress and health.`}
            action={!accounts.rows.length && <button className="btn sm" onClick={() => setModal({ type: 'account' })}><Plus size={14} /> Add account</button>}
          />
        </Card>
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
              onQuick={() => setModal({ type: 'quick', row: a })}
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
      {modal?.type === 'quick' && (
        <FormModal
          title={`Update ${modal.row.firm}${modal.row.label ? ` · ${modal.row.label}` : ''}`}
          fields={[
            { name: 'current_balance', label: 'Current balance ($)', type: 'number', required: true, full: true, hint: 'Copy it from your prop firm dashboard at the end of the day' },
            { name: 'status', label: 'Status', type: 'select', options: STATUS[kind], required: true, full: true },
          ]}
          initial={modal.row}
          onSave={(v) => accounts.update(modal.row.id, v)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'payout' && (
        <FormModal
          title={`${modal.row ? 'Edit' : 'Add'} payout · ${modal.account.firm}`}
          fields={payoutFields}
          initial={modal.row}
          onSave={(v) => (modal.row ? payouts.update(modal.row.id, v) : payouts.insert({ ...v, account_id: modal.account.id, firm: modal.account.firm }))}
          onDelete={modal.row && (() => payouts.remove(modal.row.id))}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function AccountCard({ a, isEval, trades, payouts, onEdit, onPayout, onQuick }) {
  const m = accountMetrics(a, trades)
  const statusClass = a.status.toLowerCase().replace(/\s+/g, '-')
  const paid = sum(payouts.filter((p) => p.status === 'Received'), 'amount')
  const ddTone = m.health === 'At risk' ? 'danger' : m.health === 'Caution' ? 'warn' : 'violet'

  return (
    <Card className="hover">
      <div className="acct-top">
        <div className={`acct-avatar ${isEval ? 'v' : ''}`}>{a.firm.slice(0, 1).toUpperCase()}</div>
        <div className="acct-title">
          <strong>{a.firm}</strong>
          <small>{[a.label, m.size ? money(m.size) : null, a.drawdown_type].filter(Boolean).join(' · ') || '—'}</small>
        </div>
        <span className={`pill ${statusClass}`}>{a.status}</span>
      </div>

      <div className="acct-balance">
        <div>
          <small>Balance</small>
          <span className="big">{m.bal != null ? money(m.bal, { cents: true }) : '—'}</span>
        </div>
        {isEval && m.targetProgress != null ? (
          <ProgressRing value={m.targetProgress} size={56} stroke={6}>
            <span className="ring-value" style={{ fontSize: '0.72rem' }}>{pct(m.targetProgress)}</span>
          </ProgressRing>
        ) : !isEval && m.health ? (
          <span className={`pill ${healthClass(m.health)}`}>{m.health}</span>
        ) : null}
      </div>

      <div className="acct-kpis">
        <div><small>Profit</small><strong className={pnlClass(m.profit)}>{m.profit != null ? signedMoney(m.profit) : '—'}</strong></div>
        <div><small>{isEval ? 'Trading days' : 'Journal P&L'}</small><strong className={isEval ? '' : pnlClass(m.journalPnl)}>{isEval ? m.tradingDays : trades.length ? signedMoney(m.journalPnl) : '—'}</strong></div>
        <div><small>Win rate</small><strong>{trades.length ? pct(m.wins / trades.length) : '—'}</strong></div>
      </div>

      {m.target > 0 && (
        <div className="meter">
          <div className="meter-label">
            <span><Target size={12} /> {isEval ? 'Profit target' : 'Payout progress'}</span>
            <span><b>{m.profit != null ? money(Math.max(m.profit, 0)) : '—'}</b> / {money(m.target)}</span>
          </div>
          <Bar value={m.targetProgress} />
        </div>
      )}
      {m.dd > 0 && isEval && (
        <div className="meter">
          <div className="meter-label">
            <span><ShieldHalf size={12} /> Max drawdown</span>
            <span><b>{money(m.dd)}</b> fixed</span>
          </div>
        </div>
      )}
      {m.dd > 0 && !isEval && (
        <div className="meter">
          <div className="meter-label">
            <span><ShieldHalf size={12} /> Drawdown buffer</span>
            <span><b>{m.cushion != null ? money(m.cushion) : '—'}</b> left of {money(m.dd)}</span>
          </div>
          <Bar tone={ddTone} value={m.cushion != null ? Math.min(m.cushion / m.dd, 1) : 0} />
        </div>
      )}
      {(m.target === 0 || m.dd === 0 || m.bal == null) && (
        <div className="field-hint">
          Add {[m.bal == null && 'balance', m.target === 0 && (isEval ? 'profit target' : 'payout target'), m.dd === 0 && 'max drawdown'].filter(Boolean).join(', ')} to see progress bars.
        </div>
      )}

      {!isEval && (
        <div className="payouts">
          <div className="meter-label">
            <span><HandCoins size={12} /> Payouts received <b>{money(paid)}</b></span>
          </div>
          {payouts.slice(0, 3).map((p) => (
            <button key={p.id} className="payout-row" onClick={() => onPayout(p)}>
              <span>{niceDate(p.payout_date)}</span>
              <span className={`pill tiny ${p.status.toLowerCase()}`}>{p.status}</span>
              <strong>{money(p.amount, { cents: true })}</strong>
            </button>
          ))}
        </div>
      )}
      <div className="card-actions">
        <button className="btn sm" onClick={onQuick}><RefreshCw size={13} /> Update balance</button>
        {!isEval && <button className="btn ghost sm" onClick={() => onPayout(null)}><HandCoins size={13} /> Add payout</button>}
        <button className="btn ghost sm" onClick={onEdit}><Pencil size={13} /> Edit</button>
      </div>
      {a.start_date && <div className="field-hint"><CalendarDays size={11} style={{ verticalAlign: '-1px' }} /> Started {niceDate(a.start_date)}</div>}
    </Card>
  )
}
