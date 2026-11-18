import { useState } from 'react'
import { Plus, Pencil, BookOpenText, LogIn, LogOut, Ban, Clock, LineChart } from 'lucide-react'
import { useTable } from '../lib/useTable'
import { signedMoney, sum, pct, pnlClass } from '../lib/format'
import { Card, PageHeader, Empty, FormModal, Loading, ErrorNote } from '../components/ui'
import { SakuraBranch } from '../components/Botanicals'

const fields = [
  { name: 'name', label: 'Setup name', required: true, placeholder: 'e.g. Opening range breakout' },
  { name: 'market', label: 'Market', placeholder: 'e.g. NQ, ES' },
  { name: 'timeframe', label: 'Timeframe', placeholder: 'e.g. 5-min' },
  { name: 'description', label: 'What it looks like', type: 'textarea' },
  { name: 'entry_rules', label: 'Entry rules', type: 'textarea' },
  { name: 'exit_rules', label: 'Exit / target rules', type: 'textarea' },
  { name: 'invalidation', label: 'When NOT to take it', type: 'textarea' },
]

export default function Playbook() {
  const setups = useTable('playbook_setups', { ascending: true })
  const trades = useTable('trades')
  const [modal, setModal] = useState(null)

  return (
    <div className="page">
      <PageHeader title="Trading playbook" subtitle="Only the setups that have earned a place in your garden" art={<SakuraBranch />}>
        <button className="btn" onClick={() => setModal({})}><Plus size={16} /> New setup</button>
      </PageHeader>
      <ErrorNote error={setups.error} />
      {setups.loading ? (
        <Loading />
      ) : setups.rows.length === 0 ? (
        <Empty
          title="Your playbook is empty"
          text="Write down your A+ setups. Your journal will then show how each one performs."
          action={<button className="btn" onClick={() => setModal({})}><Plus size={16} /> Add first setup</button>}
        />
      ) : (
        <div className="grid cards">
          {setups.rows.map((s) => {
            const t = trades.rows.filter((x) => x.setup_id === s.id)
            const pnl = sum(t, 'pnl')
            const wins = t.filter((x) => Number(x.pnl) > 0).length
            return (
              <Card key={s.id} className="setup-card">
                <div className="acct-top">
                  <div className="acct-avatar leaf"><BookOpenText size={18} /></div>
                  <div className="acct-title">
                    <strong>{s.name}</strong>
                    <small>{[s.market, s.timeframe].filter(Boolean).join(' · ') || 'Any market'}</small>
                  </div>
                  <button className="icon-btn" onClick={() => setModal({ row: s })} aria-label="Edit setup"><Pencil size={15} /></button>
                </div>
                <div className="setup-stats">
                  <div><strong>{t.length}</strong><small>trades</small></div>
                  <div><strong>{t.length ? pct(wins / t.length) : '—'}</strong><small>win rate</small></div>
                  <div><strong className={pnlClass(pnl)}>{t.length ? signedMoney(pnl) : '—'}</strong><small>P&L</small></div>
                </div>
                {s.description && <p className="setup-desc">{s.description}</p>}
                <Rule icon={LogIn} title="Entry" text={s.entry_rules} />
                <Rule icon={LogOut} title="Exit" text={s.exit_rules} />
                <Rule icon={Ban} title="Skip if" text={s.invalidation} tone="warn" />
              </Card>
            )
          })}
        </div>
      )}
      {modal && (
        <FormModal
          title={modal.row ? 'Edit setup' : 'New setup'}
          fields={fields}
          initial={modal.row}
          onSave={(v) => (modal.row ? setups.update(modal.row.id, v) : setups.insert(v))}
          onDelete={modal.row && (() => setups.remove(modal.row.id))}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function Rule({ icon: Icon, title, text, tone = '' }) {
  if (!text) return null
  return (
    <div className={`rule ${tone}`}>
      <span className="rule-icon"><Icon size={14} /></span>
      <div><strong>{title}</strong><p>{text}</p></div>
    </div>
  )
}
