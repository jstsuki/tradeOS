import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { MatchaBowl, SakuraBranch } from '../components/Botanicals'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setMsg('')
    const fn = mode === 'signin' ? 'signInWithPassword' : 'signUp'
    const { data, error } = await supabase.auth[fn]({
      email,
      password,
      options: mode === 'signup' ? { emailRedirectTo: window.location.origin } : undefined,
    })
    if (error) setErr(error.message)
    else if (mode === 'signup' && !data.session)
      setMsg('Almost there! Check your email and click the confirmation link, then log in here.')
    setBusy(false)
  }

  return (
    <div className="login">
      <SakuraBranch className="login-sakura" />
      <form className="login-card" onSubmit={submit}>
        <MatchaBowl className="login-bowl" />
        <h1>MarketOS</h1>
        <p className="muted">{mode === 'signin' ? 'Welcome back to your garden' : 'Create your private account'}</p>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {err && <p className="error">{err}</p>}
        {msg && <p className="note">{msg}</p>}
        <button className="btn wide" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Log in' : 'Create account'}
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setErr('')
            setMsg('')
          }}
        >
          {mode === 'signin' ? 'First time here? Create your account' : 'Already have an account? Log in'}
        </button>
      </form>
    </div>
  )
}
