export const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`)

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

export const startOfWeek = (d: Date) => {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() - r.getDay())
  return r
}

export const parseDateKey = (s?: string): Date => {
  if (!s) return new Date()
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return new Date()
  return new Date(y, m - 1, d)
}

export const parseDateTime = (date: string, time?: string): Date => {
  const [y, m, d] = date.split('-').map(Number)
  const [hh = 0, mm = 0] = (time || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

export const isPastDateTime = (date: string, time?: string, now = new Date()) =>
  parseDateTime(date, time).getTime() < now.getTime()
