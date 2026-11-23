import { ListChecks, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { useData } from '../../context/DataContext'
import { todayKey } from '../../lib/dates'
import { dailyChallenges } from '../../lib/rewards'
import { tasksOn } from '../../lib/stats'
import { TaskCheckbox } from '../planner/TaskCheckbox'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/Misc'
import { ProgressBar } from '../ui/Progress'
import { cn } from '../../lib/utils'
import { formatClock, formatDuration } from '../../lib/dates'

export function TodayChecklist() {
  const { data, toggleTask } = useData()
  const today = todayKey()
  const tasks = [...tasksOn(data, today)].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const done = tasks.filter((t) => t.completed).length
  const goals = dailyChallenges(data, today)

  return (
    <Card>
      <CardHeader
        icon={ListChecks}
        title="Today’s goals"
        description={tasks.length ? `${done} of ${tasks.length} tasks complete` : 'Your checklist for today'}
        action={
          <Button as={Link} to="/planner" variant="secondary" size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Add task
          </Button>
        }
      />

      <ul className="mb-5 grid gap-3 sm:grid-cols-3">
        {goals.map((g) => (
          <li key={g.id} className="rounded-xl border border-border bg-bg/60 p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted">{g.title}</span>
              <span className={cn('text-xs font-semibold tabular-nums', g.done ? 'text-accent' : 'text-fg')}>
                {g.progress}
                {g.unit ?? ''}/{g.goal}
                {g.unit ?? ''}
              </span>
            </div>
            <ProgressBar value={g.progress} max={g.goal} label={g.title} />
          </li>
        ))}
      </ul>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks planned for today"
          description="Add a few focused study tasks and check them off as you go."
          action={
            <Button as={Link} to="/planner" size="sm">
              Plan today
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <TaskCheckbox checked={t.completed} onChange={() => toggleTask(t.id)} label={t.title} />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-medium transition', t.completed && 'text-muted line-through')}>{t.title}</p>
                <p className="text-xs text-muted">
                  {t.subject}
                  {t.time && ` · ${formatClock(t.time)}`} · {formatDuration(t.durationMin)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
