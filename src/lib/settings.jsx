import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const SettingsContext = createContext(null)

// Starter checklist wording (not trading data). Fully editable on the Overview page.
const DEFAULT_ITEMS = [
  ['prep', 'Check the economic calendar for news'],
  ['prep', 'Mark key levels: prior high, low & close'],
  ['prep', 'Note the overnight / pre-market range'],
  ['prep', 'Decide my bias and A+ setups for today'],
  ['prep', 'Set my max loss and stop for the day'],
  ['prep', 'Breathe, hydrate, calm mind'],
  ['validation', 'This setup is in my playbook'],
  ['validation', 'Trading with my higher-timeframe bias'],
  ['validation', 'Clear stop placed before entry'],
  ['validation', 'Risk is within my per-trade limit'],
  ['validation', 'Reward is at least 2× my risk'],
  ['validation', 'I am calm, not chasing or revenge trading'],
]

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const started = useRef(false)

  const load = useCallback(async () => {
    let { data } = await supabase.from('user_settings').select('*').maybeSingle()
    if (!data) {
      const res = await supabase.from('user_settings').insert({}).select().single()
      data = res.data
    }
    if (data && !data.seeded) {
      await supabase
        .from('checklist_items')
        .insert(DEFAULT_ITEMS.map(([list, label], i) => ({ list, label, sort: i })))
      const res = await supabase
        .from('user_settings')
        .update({ seeded: true })
        .eq('user_id', data.user_id)
        .select()
        .single()
      data = res.data || data
    }
    setSettings(data)
  }, [])

  useEffect(() => {
    if (started.current) return // avoid running the first-time setup twice
    started.current = true
    load()
  }, [load])

  const save = async (values) => {
    const { data, error } = await supabase
      .from('user_settings')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('user_id', settings.user_id)
      .select()
      .single()
    if (error) throw error
    setSettings(data)
  }

  return (
    <SettingsContext.Provider value={{ settings, save, reload: load }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
