import { NavLink, Outlet } from 'react-router-dom'
import {
  Flower2, Sprout, Trophy, Wallet, BookOpenText, ChartSpline, NotebookPen, LogOut,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Bamboo } from './Botanicals'

export const NAV = [
  { to: '/', label: 'Overview', icon: Flower2, end: true },
  { to: '/evaluations', label: 'Evaluations', icon: Sprout },
  { to: '/funded', label: 'Funded', icon: Trophy },
  { to: '/finances', label: 'Finances', icon: Wallet },
  { to: '/playbook', label: 'Playbook', icon: BookOpenText },
  { to: '/analytics', label: 'Analytics', icon: ChartSpline },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
]

export default function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">抹</span>
          <div>
            <strong>MarketOS</strong>
            <small>matcha garden</small>
          </div>
        </div>
        <nav>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Bamboo className="sidebar-art" />
        <button className="nav-link logout" onClick={() => supabase.auth.signOut()}>
          <LogOut size={18} />
          <span>Log out</span>
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="bottom-link" aria-label={label}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
