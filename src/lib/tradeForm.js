import { todayISO } from './format'

export const MOODS = ['😌 Calm', '🎯 Focused', '😊 Confident', '😬 Anxious', '😤 Frustrated', '🤑 Greedy', '😴 Tired', '😨 Fearful']

// Fields for the "Log a trade" form, shared by the Overview and the Journal.
export const tradeFields = (accounts, setups, date) => [
  { name: 'trade_date', label: 'Date', type: 'date', required: true, default: date || todayISO() },
  { name: 'symbol', label: 'Symbol', required: true, placeholder: 'e.g. NQ' },
  { name: 'direction', label: 'Direction', type: 'select', options: ['Long', 'Short'], required: true, default: 'Long' },
  { name: 'pnl', label: 'P&L ($, after fees)', type: 'number', required: true },
  { name: 'account_id', label: 'Account', type: 'select', options: accounts.map((a) => [a.id, `${a.firm}${a.label ? ` · ${a.label}` : ''}`]), hint: 'Leave blank for brokerage / personal trades' },
  { name: 'setup_id', label: 'Playbook setup', type: 'select', options: setups.map((s) => [s.id, s.name]) },
  { name: 'contracts', label: 'Contracts / size', type: 'number' },
  { name: 'r_multiple', label: 'R multiple', type: 'number', placeholder: 'e.g. 2 or -1' },
  { name: 'entry_price', label: 'Entry price', type: 'number' },
  { name: 'exit_price', label: 'Exit price', type: 'number' },
  { name: 'mood', label: 'How I felt', type: 'select', options: MOODS },
  { name: 'followed_plan', label: 'I followed my plan', type: 'checkbox', default: true },
  { name: 'notes', label: 'Notes & lessons', type: 'textarea' },
]
