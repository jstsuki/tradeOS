import { useEffect, useMemo, useState } from 'react'
import {
  Target, ShieldCheck, ListChecks, BadgeCheck, StickyNote, Plus, X, Pencil, Calculator,
  RotateCcw, Sprout, Trophy, Wallet, OctagonAlert,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTable } from '../lib/useTable'
import { useSettings } from '../lib/settings'
import { money, signedMoney, sum, todayISO, pnlClass } from '../lib/format'
import { Card, PageHeader, ProgressRing, Bar, Stat, FormModal } from '../components/ui'
import { SakuraBranch } from '../components/Botanicals'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Overview() {
  const { settings, save } = useSettings()
  const today = todayISO()
  const trades = useTable('trades', { eq: { trade_date: today } })
  const accounts = useTable('accounts')
  const payouts = useTable('payouts')
  const expenses = useTable('expenses')
  const [editSettings, setEditSettings] = useState(false)

  const goal = Number(settings?.daily_goal) || 1000
  const maxLoss = Number(settings?.max_daily_loss) || 0
  const maxTrades = Number(settings?.max_trades_per_day) || 0
  const todayPnl = sum(trades.rows, 'pnl')
  const tradeCount = trades.rows.length
  const lossUsed = todayPnl < 0 && maxLoss ? Math.abs(todayPnl) / maxLoss : 0
  const stopTrading = (maxLoss && todayPnl <= -maxLoss) || (maxTrades && tradeCount >= maxTrades)

  const evalActive = accounts.rows.filter((a) => a.kind === 'evaluation' && a.status === 'Active').length
  const fundedActive = accounts.rows.filter((a) => a.kind === 'funded' && a.status === 'Active').length
  const net = sum(payouts.rows.filter((p) => p.status === 'Received'), 'amount') - sum(expenses.rows, 'amount')

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="page">
      <PageHeader title={`${greeting()}, Susie`} subtitle={dateLabel} art={<SakuraBranch />} />

      <div className="grid overview-top">
        <Card title="Today’s goal" icon={Target} className="goal-card"
          action={<button className="icon-btn" onClick={() => setEditSettings(true)} aria-label="Edit goals and limits"><Pencil size={16} /></button>}>
          <div className="goal-body">
            <ProgressRing value={todayPnl / goal} size={170}>
              <div className={`ring-value ${pnlClass(todayPnl)}`}>{signedMoney(todayPnl)}</div>
              <div className="ring-sub">of {money(goal)}</div>
            </ProgressRing>
            <div className="goal-side">
              {todayPnl >= goal ? (
                <p className="bloom">Goal reached. Close the charts and enjoy your tea 🍵</p>
              ) : (
                <p className="muted">{money(Math.max(goal - todayPnl, 0))} to go</p>
              )}
              <div className="mini-stats">
                <div><span>{tradeCount}{maxTrades ? `/${maxTrades}` : ''}</span><small>trades</small></div>
                <div><span>{trades.rows.filter((t) => Number(t.pnl) > 0).length}</span><small>wins</small></div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Risk guard" icon={ShieldCheck} className={stopTrading ? 'alert-card' : ''}>
          {stopTrading ? (
            <div className="stop-banner">
              <OctagonAlert size={20} /> Limit reached. Step away for today.
            </div>
          ) : null}
          <div className="risk-row">
            <span>Daily loss used</span>
            <strong>{money(Math.max(-todayPnl, 0))} / {money(maxLoss)}</strong>
          </div>
          <Bar value={lossUsed} tone={lossUsed >= 0.75 ? 'danger' : lossUsed >= 0.5 ? 'warn' : ''} />
          <div className="risk-row">
            <span>Trades taken</span>
            <strong>{tradeCount} / {maxTrades || '∞'}</strong>
          </div>
          <Bar value={maxTrades ? tradeCount / maxTrades : 0} tone={maxTrades && tradeCount >= maxTrades ? 'danger' : ''} />
          <PositionSizer />
        </Card>

        <div className="stack">
          <Stat icon={Sprout} label="Active evaluations" value={evalActive} />
          <Stat icon={Trophy} label="Active funded" value={fundedActive} />
          <Stat icon={Wallet} label="Net prop profit" value={signedMoney(net)} tone={pnlClass(net)} />
        </div>
      </div>

      <div className="grid three">
        <Checklist list="prep" title="Market prep" icon={ListChecks} daily />
        <Checklist list="validation" title="Trade validation" icon={BadgeCheck} />
        <Reminders />
      </div>

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

function PositionSizer() {
  const [risk, setRisk] = useState('')
  const [stop, setStop] = useState('')
  const [ppv, setPpv] = useState('')
  const contracts = risk && stop && ppv ? Math.floor(Number(risk) / (Number(stop) * Number(ppv))) : null
  return (
    <div className="sizer">
      <div className="sizer-title"><Calculator size={14} /> Position size</div>
      <div className="sizer-inputs">
        <label><small>Risk $</small><input type="number" step="any" value={risk} onChange={(e) => setRisk(e.target.value)} placeholder="200" /></label>
        <label><small>Stop (pts)</small><input type="number" step="any" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="10" /></label>
        <label><small>$ / pt</small><input type="number" step="any" value={ppv} onChange={(e) => setPpv(e.target.value)} placeholder="5" /></label>
      </div>
      <div className="sizer-out">
        {contracts === null ? <span className="muted">Fill in to see contracts</span> : <><strong>{contracts}</strong> contract{contracts === 1 ? '' : 's'} max</>}
      </div>
    </div>
  )
}

function Checklist({ list, title, icon, daily }) {
  const items = useTable('checklist_items', { order: 'sort', ascending: true, eq: { list } })
  const today = todayISO()
  const [checked, setChecked] = useState(() => new Set())
  const [adding, setAdding] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!daily) return
    supabase
      .from('checklist_checks')
      .select('item_id')
      .eq('check_date', today)
      .then(({ data }) => data && setChecked(new Set(data.map((d) => d.item_id))))
  }, [daily, today])

  const toggle = async (id) => {
    const next = new Set(checked)
    const on = !next.has(id)
    on ? next.add(id) : next.delete(id)
    setChecked(next)
    if (!daily) return
    if (on) await supabase.from('checklist_checks').insert({ item_id: id, check_date: today })
    else await supabase.from('checklist_checks').delete().eq('item_id', id).eq('check_date', today)
  }

  const add = async (e) => {
    e.preventDefault()
    if (!adding.trim()) return
    await items.insert({ label: adding.trim(), sort: items.rows.length + 100 })
    setAdding('')
  }

  const done = items.rows.filter((i) => checked.has(i.id)).length
  const total = items.rows.length
  const complete = total > 0 && done === total

  return (
    <Card
      title={title}
      icon={icon}
      className={complete ? 'complete' : ''}
      action={
        <div className="row-actions">
          {!daily && done > 0 && (
            <button className="icon-btn" onClick={() => setChecked(new Set())} aria-label="Reset"><RotateCcw size={15} /></button>
          )}
          <button className={`icon-btn ${editing ? 'on' : ''}`} onClick={() => setEditing(!editing)} aria-label="Edit list"><Pencil size={15} /></button>
        </div>
      }
    >
      <div className="check-progress">
        <Bar value={total ? done / total : 0} />
        <small>{done}/{total}</small>
      </div>
      {!daily && total > 0 && (
        <div className={`verdict ${complete ? 'ok' : ''}`}>
          {complete ? '✓ Valid trade. Execute with confidence.' : `${total - done} check${total - done === 1 ? '' : 's'} left before entry`}
        </div>
      )}
      {daily && complete && <div className="verdict ok">✓ Prepared for the session</div>}
      <ul className="checklist">
        {items.rows.map((i) => (
          <li key={i.id} className={checked.has(i.id) ? 'done' : ''}>
            <button className="check" onClick={() => toggle(i.id)} aria-pressed={checked.has(i.id)}>
              <span className="box" />
              <span>{i.label}</span>
            </button>
            {editing && (
              <button className="icon-btn sm" onClick={() => items.remove(i.id)} aria-label="Remove item"><X size={14} /></button>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <form className="inline-add" onSubmit={add}>
          <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a step…" />
          <button className="icon-btn" aria-label="Add"><Plus size={16} /></button>
        </form>
      )}
    </Card>
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
  const tints = useMemo(() => ['tint-a', 'tint-b', 'tint-c', 'tint-d'], [])
  return (
    <Card title="Reminders" icon={StickyNote}>
      <div className="notes">
        {r.rows.length === 0 && <p className="muted small">Little notes to your trading self. “Patience pays.”</p>}
        {r.rows.map((n, i) => (
          <div key={n.id} className={`note-card ${tints[i % tints.length]}`}>
            <span>{n.text}</span>
            <button className="icon-btn sm" onClick={() => r.remove(n.id)} aria-label="Remove reminder"><X size={13} /></button>
          </div>
        ))}
      </div>
      <form className="inline-add" onSubmit={add}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a reminder…" />
        <button className="icon-btn" aria-label="Add"><Plus size={16} /></button>
      </form>
    </Card>
  )
}
