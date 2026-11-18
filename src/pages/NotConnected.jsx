
export default function NotConnected() {
  return (
    <div className="login">
      <div className="login-card">
        <div className="brand-mark">M</div>
        <h1>Almost ready</h1>
        <p className="muted">
          MarketOS isn’t connected to Supabase yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in your hosting settings, then redeploy.
        </p>
      </div>
    </div>
  )
}
