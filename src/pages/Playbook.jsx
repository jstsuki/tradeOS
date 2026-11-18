import { useState } from 'react'
import { Plus, Pencil, BookMarked, LogIn, LogOut, OctagonAlert, ChevronDown, ShieldCheck, FlaskConical, TriangleAlert } from 'lucide-react'
import { useTable } from '../lib/useTable'
import { signedMoney, sum, pct, pnlClass } from '../lib/format'
import { Card, Toolbar, Empty, FormModal, Loading, ErrorNote, ProgressRing } from '../components/ui'

const MIN_TRADES = 5

const fields = [
  { name: 'name', label: 'Setup name', required: true, placeholder: 'e.g. VWAP reclaim' },
  { name: 'market', label: 'Market', placeholder: 'e.g. NQ, ES' },
  { name: 'timeframe', label: 'Timeframe', placeholder: 'e.g. 5-min' },
  { name: 'description', label: 'Short description', type: 'textarea' },
  { name: 'entry_rules', label: 'Entry rules', type: 'textarea', hint: 'One rule per line' },
  { name: 'exit_rules', label: 'Exit / target rules', type: 'textarea', hint: 'One rule per line' },
  { name: 'invalidation', label: 'Do NOT take it when…', type: 'textarea', hint: 'One warning per line' },
]

const lines = (t) => (t || '').split('\n').map((s) => s.replace(/^[-•*\s]+/, '').trim()).filter(Boolean)

export default function Playbook() {
  const setups = useTable('playbook_setups', { ascending: true })
  const trades = useTable('trades')
  const [modal, setModal] = useState(null)
  const [open, setOpen] = useState(null)

  return (
    <div className="page">
      <Toolbar actions={<button className="btn" onClick={() => setModal({})}><Plus size={15} /> New setup</button>}>
        <span className="toolbar-sub">{setups.rows.length} setup{setups.rows.length === 1 ? '' : 's'} · edge shown after {MIN_TRADES} journaled trades</span>
      </Toolbar>
      <ErrorNote error={setups.error} />
      {setups.loading ? (
        <Loading />
      ) : setups.rows.length === 0 ? (
        <Card>
          <Empty
            icon={BookMarked}
            title="Your playbook is empty"
            text="Add the setups you trade. Tag journal trades with them to see each one’s edge."
            action={<button className="btn sm" onClick={() => setModal({})}><Plus size={14} /> Add setup</button>}
          />
        </Card>
      ) : (
        <div className="grid cards">
          {setups.rows.map((s) => {
            const t = trades.rows.filter((x) => x.setup_id === s.id)
            const pnl = sum(t, 'pnl')
            const wins = t.filter((x) => Number(x.pnl) > 0).length
            const adherence = t.length ? t.filter((x) => x.followed_plan).length / t.length : null
            const enough = t.length >= MIN_TRADES
            const edge = !enough ? 'testing' : pnl > 0 ? 'proven' : 'losing'
            const isOpen = open === s.id
            const warns = lines(s.invalidation)
            return (
              <Card key={s.id} className={`hover ${edge === 'proven' ? 'selected' : ''}`}>
                <div className="acct-top">
                  <ProgressRing value={t.length ? wins / t.length : 0} size={44} stroke={5}>
                    <span className="ring-value" style={{ fontSize: '0.66rem' }}>{t.length ? pct(wins / t.length) : '—'}</span>
                  </ProgressRing>
                  <div className="acct-title">
                    <strong>{s.name}</strong>
                    <small>{[s.market, s.timeframe].filter(Boolean).join(' · ') || 'Any market'}</small>
                  </div>
                  <button className="btn ghost sm" onClick={() => setModal({ row: s })}><Pencil size={13} /> Edit</button>
                </div>

                <div className="setup-stats">
                  <div><strong>{t.length}</strong><small>trades</small></div>
                  <div><strong className={pnlClass(pnl)}>{t.length ? signedMoney(pnl) : '—'}</strong><small>P&L</small></div>
                  <div><strong>{adherence == null ? '—' : pct(adherence)}</strong><small>on plan</small></div>
                </div>

                <div className="row-actions" style={{ flexWrap: 'wrap' }}>
                  {edge === 'proven' && <span className="pill healthy"><ShieldCheck size={11} /> Proven edge</span>}
                  {edge === 'losing' && <span className="pill at-risk"><TriangleAlert size={11} /> Losing over {t.length} trades</span>}
                  {edge === 'testing' && <span className="pill"><FlaskConical size={11} /> Testing {t.length}/{MIN_TRADES}</span>}
                  {adherence != null && adherence < 0.7 && <span className="pill caution">Often traded off plan</span>}
                  {warns.length > 0 && <span className="pill failed">{warns.length} no-trade rule{warns.length === 1 ? '' : 's'}</span>}
                </div>

                <button className="link-btn" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                  {isOpen ? 'Hide rules' : 'Show rules'} <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : '', transition: 'transform .2s' }} />
                </button>
                {isOpen && (
                  <div className="stack" style={{ gap: 12, animation: 'fade .2s ease' }}>
                    {s.description && <p className="muted small" style={{ margin: 0 }}>{s.description}</p>}
                    <Rule icon={LogIn} title="Entry" items={lines(s.entry_rules)} />
                    <Rule icon={LogOut} title="Exit" items={lines(s.exit_rules)} />
                    <Rule icon={OctagonAlert} title="Do not take it when" items={warns} tone="warn" />
                    {!s.entry_rules && !s.exit_rules && !warns.length && <p className="faint small" style={{ margin: 0 }}>No rules written yet. Click Edit to add them.</p>}
                  </div>
                )}
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

function Rule({ icon: Icon, title, items, tone = '' }) {
  if (!items.length) return null
  return (
    <div className={`rule ${tone}`}>
      <span className="rule-icon"><Icon size={13} /></span>
      <div>
        <strong>{title}</strong>
        <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </div>
    </div>
  )
}
