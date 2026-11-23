const pad = (n) => String(n).padStart(2, '0')

export const toKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toKey(new Date())

export const addDays = (key, amount) => {
  const date = fromKey(key)
  date.setDate(date.getDate() + amount)
  return toKey(date)
}

export const startOfWeek = (key) => {
  const date = fromKey(key)
  const mondayOffset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - mondayOffset)
  return toKey(date)
}

export const weekKeys = (key) => {
  const start = startOfWeek(key)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const formatDate = (key, options) => fromKey(key).toLocaleDateString('en-US', options)

export const relativeLabel = (key) => {
  const today = todayKey()
  if (key === today) return 'Today'
  if (key === addDays(today, -1)) return 'Yesterday'
  if (key === addDays(today, 1)) return 'Tomorrow'
  return null
}

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const formatClock = (hhmm) => {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m ? `${hour}:${pad(m)} ${suffix}` : `${hour} ${suffix}`
}

export const isOvernight = (start, end) => toMinutes(end) <= toMinutes(start)

export const slotDuration = (start, end) => {
  const s = toMinutes(start)
  const e = toMinutes(end)
  return e > s ? e - s : e + 1440 - s
}

export const isWithinSlot = (start, end, minutesNow) => {
  const s = toMinutes(start)
  const e = toMinutes(end)
  if (e > s) return minutesNow >= s && minutesNow < e
  return minutesNow >= s || minutesNow < e
}

export const formatDuration = (minutes) => {
  const total = Math.max(0, Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

export const formatHours = (minutes) => {
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

export const timeAgo = (timestamp) => {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Burning the midnight oil'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
