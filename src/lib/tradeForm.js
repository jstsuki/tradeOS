import { supabase } from './supabase'
import { todayISO } from './format'

export const MOODS = ['😌 Calm', '🎯 Focused', '😊 Confident', '😬 Anxious', '😤 Frustrated', '🤑 Greedy', '😴 Tired', '😨 Fearful']

const GROUP = 'group:'

// Active accounts per firm. A firm with 2+ active accounts becomes a copy group.
export const copyGroups = (accounts) => {
  const m = {}
  accounts.filter((a) => a.status === 'Active').forEach((a) => (m[a.firm] = m[a.firm] || []).push(a))
  return Object.entries(m)
    .filter(([, list]) => list.length > 1)
    .map(([firm, list]) => ({ firm, accounts: list }))
}

const accountLabel = (a) => `${a.firm}${a.label ? ` · ${a.label}` : ''}`

// Fields for the "Log a trade" form, shared by the Overview and the Journal.
// `editingGroup` hides the account picker when editing a trade copied to several accounts.
export const tradeFields = (accounts, setups, date, { editingGroup = false, defaultAccount } = {}) => {
  const groups = copyGroups(accounts)
  const accountField = {
    name: 'account_id',
    label: 'Account or copy group',
    type: 'select',
    default: defaultAccount ?? (groups.length ? GROUP + groups[0].firm : ''),
    options: [
      ...groups.map((g) => [GROUP + g.firm, `All ${g.accounts.length} active ${g.firm} accounts (copy trade)`]),
      ...accounts.map((a) => [a.id, accountLabel(a)]),
    ],
    hint: groups.length ? 'Pick a copy group to record this trade on every account in it at once' : 'Leave blank for brokerage / personal trades',
  }
  return [
    { name: 'trade_date', label: 'Date', type: 'date', required: true, default: date || todayISO() },
    { name: 'symbol', label: 'Symbol', required: true, placeholder: 'e.g. NQ' },
    { name: 'direction', label: 'Direction', type: 'select', options: ['Long', 'Short'], required: true, default: 'Long' },
    { name: 'pnl', label: 'P&L per account ($, after fees)', type: 'number', required: true, hint: 'For a copy group, the result on ONE account' },
    ...(editingGroup ? [] : [accountField]),
    { name: 'setup_id', label: 'Playbook setup', type: 'select', options: setups.map((s) => [s.id, s.name]) },
    { name: 'contracts', label: 'Contracts per account', type: 'number' },
    { name: 'r_multiple', label: 'R multiple', type: 'number', placeholder: 'e.g. 2 or -1' },
    { name: 'entry_price', label: 'Entry price', type: 'number' },
    { name: 'exit_price', label: 'Exit price', type: 'number' },
    { name: 'mood', label: 'How I felt', type: 'select', options: MOODS },
    { name: 'followed_plan', label: 'I followed my plan', type: 'checkbox', default: true },
    { name: 'notes', label: 'Notes & lessons', type: 'textarea' },
  ]
}

// Saves a new trade. A copy group becomes one row per account, sharing the same timestamp.
export async function saveNewTrade(values, accounts) {
  let rows
  if (values.account_id?.startsWith(GROUP)) {
    const firm = values.account_id.slice(GROUP.length)
    const stamp = new Date().toISOString()
    rows = accounts
      .filter((a) => a.status === 'Active' && a.firm === firm)
      .map((a) => ({ ...values, account_id: a.id, created_at: stamp }))
  } else {
    rows = [values]
  }
  const { error } = await supabase.from('trades').insert(rows)
  if (error) throw error
}

// Rows of one copy trade share date, symbol, direction and timestamp.
export const tradeKey = (t) => `${t.trade_date}|${t.created_at}|${t.symbol}|${t.direction}`

// Groups trade rows into "executions": a copy trade on 5 accounts counts once.
export function groupTrades(rows) {
  const m = new Map()
  for (const t of rows) {
    const k = tradeKey(t)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(t)
  }
  return [...m.values()].map((list) => ({
    key: tradeKey(list[0]),
    first: list[0],
    rows: list,
    pnl: list.reduce((s, t) => s + (Number(t.pnl) || 0), 0),
  }))
}

export const countTrades = (rows) => new Set(rows.map(tradeKey)).size

export async function updateTrades(ids, values) {
  const { error } = await supabase.from('trades').update(values).in('id', ids)
  if (error) throw error
}

export async function deleteTrades(ids) {
  const { error } = await supabase.from('trades').delete().in('id', ids)
  if (error) throw error
}
