import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useData } from '../../context/DataContext'
import { SLOT_TYPES } from '../../lib/constants'
import { formatClock, isWithinSlot, toMinutes } from '../../lib/dates'
import { cn } from '../../lib/utils'
import { Card, CardHeader } from '../ui/Card'

const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function UpNext() {
  const { data } = useData()
  const [minutes, setMinutes] = useState(nowMinutes)

  useEffect(() => {
    const id = setInterval(() => setMinutes(nowMinutes()), 60000)
    return () => clearInterval(id)
  }, [])

  const sorted = [...data.schedule].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const current = sorted.find((s) => isWithinSlot(s.start, s.end, minutes))
  const next = sorted.find((s) => toMinutes(s.start) > minutes) ?? sorted[0]

  return (
    <Card>
      <CardHeader
        icon={Clock}
        title="Timetable"
        action={
          <Link to="/timetable" className="text-sm font-medium text-accent hover:underline">
            View
          </Link>
        }
      />
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">Your timetable is empty.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {[current && { label: 'Now', slot: current }, next && next !== current && { label: 'Next', slot: next }]
            .filter(Boolean)
            .map(({ label, slot }) => {
              const type = SLOT_TYPES.find((t) => t.id === slot.type) ?? SLOT_TYPES[4]
              return (
                <div key={label} className={cn('flex items-center gap-3 rounded-xl border p-3', label === 'Now' ? 'border-accent/30 bg-accent/5' : 'border-border')}>
                  <span className={cn('h-9 w-1 rounded-full', type.className)} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
                    <p className="truncate text-sm font-semibold">{slot.name}</p>
                  </div>
                  <span className="text-xs tabular-nums text-muted">
                    {formatClock(slot.start)} – {formatClock(slot.end)}
                  </span>
                </div>
              )
            })}
        </div>
      )}
    </Card>
  )
}
