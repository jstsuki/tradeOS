import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { MatchaBowl, SakuraBranch } from '../components/Botanicals'

// Private app: log in only. New accounts are not created from this page.
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <div className="login">
      <SakuraBranch className="login-sakura" />
      <form className="login-card" onSubmit={submit}>
        <MatchaBowl className="login-bowl" />
        <h1>MarketOS</h1>
        <p className="muted">Welcome back to your garden</p>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {err && <p className="error">{err}</p>}
        <button className="btn wide" disabled={busy}>
          {busy ? 'One moment…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}
