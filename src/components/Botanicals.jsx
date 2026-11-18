// Hand-drawn style botanical illustrations (inline SVG, no image files needed).

export function MatchaSprig({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 120 160" fill="none" aria-hidden="true">
      <path d="M60 156C58 120 62 80 70 40" stroke="var(--leaf-dark)" strokeWidth="3" strokeLinecap="round" />
      <path d="M62 120c-18-2-32-14-36-30 18 0 32 12 36 30z" fill="var(--leaf)" />
      <path d="M64 96c16-4 28-18 30-34-17 2-28 16-30 34z" fill="var(--leaf-light)" />
      <path d="M66 70c-14-6-22-20-20-34 14 6 22 18 20 34z" fill="var(--leaf)" />
      <path d="M70 42c6-12 18-20 30-20-4 14-16 22-30 20z" fill="var(--leaf-light)" />
      <path d="M62 120c-10-8-20-16-30-24M64 96c8-10 16-20 24-28M66 70c-6-8-12-18-16-26" stroke="var(--leaf-dark)" strokeWidth="1.2" strokeLinecap="round" opacity=".45" />
    </svg>
  )
}

export function SakuraBranch({ className = '', style }) {
  const Blossom = ({ x, y, s = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="0" cy="-7" rx="5.2" ry="7.5" fill="var(--sakura)" transform={`rotate(${r})`} />
      ))}
      <circle r="3" fill="var(--sakura-dark)" />
    </g>
  )
  return (
    <svg className={className} style={style} viewBox="0 0 220 120" fill="none" aria-hidden="true">
      <path d="M4 20c40 10 80 14 120 34s70 40 92 60" stroke="#8a6a55" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 34c6-14 14-22 26-26M130 60c10-6 22-8 34-6" stroke="#8a6a55" strokeWidth="2.5" strokeLinecap="round" />
      <Blossom x={96} y={12} />
      <Blossom x={60} y={30} s={0.8} />
      <Blossom x={166} y={52} s={1.1} />
      <Blossom x={140} y={78} s={0.75} />
      <Blossom x={198} y={96} s={0.9} />
      <circle cx="116" cy="40" r="3" fill="var(--sakura)" />
      <circle cx="184" cy="74" r="2.5" fill="var(--sakura)" />
    </svg>
  )
}

export function MatchaBowl({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 140 120" fill="none" aria-hidden="true">
      <path d="M52 30c-4-8 4-12 0-20M70 26c-4-8 4-12 0-20M88 30c-4-8 4-12 0-20" stroke="var(--leaf-light)" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="70" cy="50" rx="52" ry="12" fill="var(--matcha)" />
      <path d="M18 50c0 32 22 54 52 54s52-22 52-54" fill="var(--bowl)" />
      <path d="M18 50c0 32 22 54 52 54s52-22 52-54" stroke="var(--bowl-dark)" strokeWidth="2" />
      <path d="M30 74c12 6 26 8 40 8s28-2 40-8" stroke="var(--bowl-dark)" strokeWidth="2" strokeLinecap="round" opacity=".35" />
      <ellipse cx="70" cy="50" rx="52" ry="12" stroke="var(--bowl-dark)" strokeWidth="2" />
      <ellipse cx="62" cy="48" rx="20" ry="4" fill="var(--leaf-light)" opacity=".6" />
      <rect x="54" y="104" width="32" height="8" rx="3" fill="var(--bowl-dark)" />
    </svg>
  )
}

export function Bamboo({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 220" fill="none" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="30" y={8 + i * 52} width="16" height="48" rx="6" fill="var(--leaf)" stroke="var(--leaf-dark)" strokeWidth="1.5" />
      ))}
      <path d="M46 60c14-6 24-16 28-30-14 2-24 14-28 30z" fill="var(--leaf-light)" />
      <path d="M30 112c-14-4-24-14-28-28 14 2 24 12 28 28z" fill="var(--leaf-light)" />
      <path d="M46 164c12-2 22-10 28-22-14 0-24 8-28 22z" fill="var(--leaf)" />
    </svg>
  )
}

export function Enso({ className = '', style, children }) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path d="M80 26A38 38 0 1 0 86 58" stroke="var(--leaf-dark)" strokeWidth="6" strokeLinecap="round" opacity=".8" />
      {children}
    </svg>
  )
}

export function LeafDivider() {
  return (
    <svg className="leaf-divider" viewBox="0 0 120 14" aria-hidden="true">
      <path d="M0 7h46M74 7h46" stroke="var(--line)" strokeWidth="1.5" />
      <path d="M60 1c-8 2-12 6-12 6s4 4 12 6c8-2 12-6 12-6s-4-4-12-6z" fill="var(--leaf-light)" />
    </svg>
  )
}
