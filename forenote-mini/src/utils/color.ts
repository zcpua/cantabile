const PALETTE: { bg: string; fg: string; bar: string }[] = [
  { bg: '#fee2e2', fg: '#b91c1c', bar: '#ef4444' },
  { bg: '#dbeafe', fg: '#1d4ed8', bar: '#3b82f6' },
  { bg: '#dcfce7', fg: '#15803d', bar: '#22c55e' },
  { bg: '#fef3c7', fg: '#b45309', bar: '#f59e0b' },
  { bg: '#ede9fe', fg: '#6d28d9', bar: '#8b5cf6' },
  { bg: '#cffafe', fg: '#0e7490', bar: '#06b6d4' },
  { bg: '#ffe4e6', fg: '#be123c', bar: '#f43f5e' }
]

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0
  return h
}

export const colorOf = (id: string) => PALETTE[hash(id) % PALETTE.length]
