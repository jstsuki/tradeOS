import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FlaskConical, Landmark, Wallet, BookMarked, ChartNoAxesCombined, NotebookPen, History, LogOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/evaluations', label: 'Evaluations', icon: FlaskConical },
  { to: '/funded', label: 'Funded accounts', icon: Landmark },
  { to: '/finances', label: 'Prop firm finances', icon: Wallet },
  { to: '/journal', label: 'Trading journal', icon: NotebookPen },
  { to: '/analytics', label: 'Performance analytics', icon: ChartNoAxesCombined },
  { to: '/playbook', label: 'Trading playbook', icon: BookMarked },
  { to: '/history', label: 'History', icon: History },
]

export default function Layout() {
  const { pathname } = useLocation()
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to))) || NAV[0]
  const [email, setEmail] = useState('')
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''))
  }, [])
  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-mark" title="MarketOS">M</div>
        <nav>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link" aria-label={label}>
              <Icon size={20} strokeWidth={1.8} />
              <span className="tip">{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className="nav-link logout" onClick={() => supabase.auth.signOut()} aria-label="Log out">
          <LogOut size={19} strokeWidth={1.8} />
          <span className="tip">Log out</span>
        </button>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <h1>{current.label}</h1>
            <div className="date">{date}</div>
          </div>
          <div className="topbar-right">
            <span className="avatar" title={email}>{(email[0] || 'S').toUpperCase()}</span>
            <button className="icon-btn mobile-only" onClick={() => supabase.auth.signOut()} aria-label="Log out">
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="bottom-link" aria-label={label}>
            <Icon size={19} strokeWidth={1.8} />
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
