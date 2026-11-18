export const C = {
  pink: '#F16A9B',
  violet: '#A99BFF',
  orchid: '#C58ACB',
  mint: '#7EE0B5',
  amber: '#F5C07A',
  grid: 'rgba(255,255,255,0.06)',
  axis: '#6F6A7D',
}

// Category palette for donuts / multi-series.
export const PALETTE = ['#F16A9B', '#A99BFF', '#C58ACB', '#7C6CF0', '#F59BBE', '#6E5FC7', '#E3A8E9', '#8E83B8']

export const chartTooltip = {
  contentStyle: {
    background: '#302936',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    boxShadow: '0 16px 40px -12px rgba(0,0,0,.7)',
    fontSize: 12,
    color: '#F5F1F7',
    padding: '8px 12px',
  },
  labelStyle: { color: '#A6A1B2', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#F5F1F7', padding: 0 },
  cursor: { stroke: 'rgba(255,255,255,0.15)', fill: 'rgba(255,255,255,0.03)' },
}

export const axis = {
  tickLine: false,
  axisLine: false,
  fontSize: 11,
  tick: { fill: '#6F6A7D' },
}

export const shortMoney = (v) => {
  const a = Math.abs(v)
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `$${Math.round(a)}`
  return v < 0 ? `-${s}` : s
}
