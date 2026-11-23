import { Target } from 'lucide-react'
import { Link } from 'react-router'
import { useData } from '../../context/DataContext'
import { todayKey } from '../../lib/dates'
import { categoryOn, totalQuestions, weekStats } from '../../lib/stats'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { ProgressBar } from '../ui/Progress'

export function SubjectCounts() {
  const { data, goal } = useData()
  const today = todayKey()
  const week = weekStats(data, today)
  const hasAny = totalQuestions(data) > 0

  return (
    <Card>
      <CardHeader
        icon={Target}
        title={goal.unit === 'problems' ? 'Problems by track' : 'Questions by subject'}
        description="Today vs. daily goal"
        action={
          <Button as={Link} to="/questions" variant="ghost" size="sm">
            Log
          </Button>
        }
      />
      <ul className="flex flex-col gap-4">
        {goal.categories.map((c) => {
          const todayCount = categoryOn(data, today, c.id)
          const weekCount = week.days.reduce((s, d) => s + d.byCategory[c.id], 0)
          return (
            <li key={c.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span className={cn('size-2 rounded-full', c.color)} aria-hidden="true" />
                  {c.label}
                </span>
                <span className="tabular-nums text-muted">
                  <span className="font-semibold text-fg">{todayCount}</span>/{c.dailyGoal} · {weekCount} wk
                </span>
              </div>
              <ProgressBar value={todayCount} max={c.dailyGoal} barClassName={c.color} label={`${c.label} today`} />
            </li>
          )
        })}
      </ul>
      {!hasAny && <p className="mt-4 text-xs text-muted">No {goal.unit} logged yet — your counts start at zero.</p>}
    </Card>
  )
}
