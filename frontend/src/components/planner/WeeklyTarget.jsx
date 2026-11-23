import { Pencil, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { formatHours } from '../../lib/dates'
import { weekStats } from '../../lib/stats'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Field'
import { ProgressBar } from '../ui/Progress'

export function WeeklyTarget({ anchorKey }) {
  const { data, setWeeklyTarget } = useData()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(data.weeklyTargetHours))
  const week = weekStats(data, anchorKey)
  const targetMin = data.weeklyTargetHours * 60
  const pct = Math.min(100, Math.round((week.minutes / targetMin) * 100))
  const plannedMin = week.days.reduce((s, d) => s + d.minutes, 0)
  const plannedAll = data.tasks.filter((t) => week.days.some((d) => d.key === t.date)).reduce((s, t) => s + (Number(t.durationMin) || 0), 0)

  const save = (e) => {
    e.preventDefault()
    setWeeklyTarget(value)
    setEditing(false)
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <TrendingUp className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold">Weekly target</h2>
            <p className="text-sm text-muted">
              <span className="font-semibold text-fg tabular-nums">{formatHours(week.minutes)}</span> of {data.weeklyTargetHours}h completed · {pct}%
            </p>
          </div>
        </div>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={() => { setValue(String(data.weeklyTargetHours)); setEditing(true) }}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </Button>
        )}
      </div>
      {editing && (
        <form onSubmit={save} className="flex items-center gap-2">
          <label htmlFor="weekly-target" className="sr-only">
            Weekly target in hours
          </label>
          <Input id="weekly-target" type="number" inputMode="numeric" min={1} max={168} value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-24" autoFocus />
          <span className="text-sm text-muted">hours / week</span>
          <Button type="submit" size="sm" className="ml-auto">
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </form>
      )}
      <ProgressBar value={plannedMin} max={targetMin} label="Weekly target progress" />
      <p className="text-xs text-muted">
        {formatHours(plannedAll)} planned this week · {formatHours(Math.max(0, targetMin - week.minutes))} to go
      </p>
    </Card>
  )
}
