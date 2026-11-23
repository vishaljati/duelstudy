import { Activity, CalendarPlus, CircleCheck, Gift, Target, Trash2, UserPlus } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { timeAgo } from '../../lib/dates'
import { Card, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/Misc'

const ICONS = {
  task: CalendarPlus,
  complete: CircleCheck,
  questions: Target,
  reward: Gift,
  friend: UserPlus,
  delete: Trash2,
}

export function ActivityFeed({ limit = 6 }) {
  const { data } = useData()
  const items = data.activity.slice(0, limit)

  return (
    <Card>
      <CardHeader icon={Activity} title="Recent activity" />
      {items.length === 0 ? (
        <EmptyState icon={Activity} title="Nothing here yet" description="Your planned tasks, logged questions and rewards will show up here." className="py-8" />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => {
            const Icon = ICONS[a.type] ?? Activity
            return (
              <li key={a.id} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-pretty">{a.text}</p>
                  <p className="text-xs text-muted">{timeAgo(a.ts)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
