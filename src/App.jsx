import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured, supabase } from './lib/supabase'
import { SettingsProvider } from './lib/settings'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import Login from './pages/Login'
import NotConnected from './pages/NotConnected'
import Overview from './pages/Overview'
import Accounts from './pages/Accounts'
import Finances from './pages/Finances'
import Playbook from './pages/Playbook'
import Analytics from './pages/Analytics'
import Journal from './pages/Journal'
import History from './pages/History'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <NotConnected />
  if (session === undefined) return <Loading />
  if (!session) return <Login />

  return (
    <SettingsProvider key={session.user.id}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="evaluations" element={<Accounts kind="evaluation" />} />
            <Route path="funded" element={<Accounts kind="funded" />} />
            <Route path="finances" element={<Finances />} />
            <Route path="playbook" element={<Playbook />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="journal" element={<Journal />} />
            <Route path="history" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  )
}
