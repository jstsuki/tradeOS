import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

// Small helper to load + add + edit + delete rows of one table.
// `eq` filters rows, e.g. { kind: 'funded' }. Row Level Security already
// limits everything to the logged-in user.
export function useTable(table, { order = 'created_at', ascending = false, eq } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const eqKey = JSON.stringify(eq || {})

  const load = useCallback(async () => {
    let q = supabase.from(table).select('*')
    for (const [k, v] of Object.entries(JSON.parse(eqKey))) q = q.eq(k, v)
    const { data, error } = await q.order(order, { ascending })
    if (error) setError(error.message)
    else {
      setError(null)
      setRows(data)
    }
    setLoading(false)
  }, [table, order, ascending, eqKey])

  useEffect(() => {
    load()
  }, [load])

  const insert = async (values) => {
    const { error } = await supabase.from(table).insert({ ...JSON.parse(eqKey), ...values })
    if (error) throw error
    await load()
  }
  const update = async (id, values) => {
    const { error } = await supabase.from(table).update(values).eq('id', id)
    if (error) throw error
    await load()
  }
  const remove = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { rows, loading, error, reload: load, insert, update, remove }
}
