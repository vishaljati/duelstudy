import { CalendarClock, Clock, Flame, Zap } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { formatDuration, formatHours, todayKey } from '../../lib/dates'
import { currentStreak, levelInfo, studyMinutesOn, tasksOn, totalXP, weekStats } from '../../lib/stats'
import { ProgressBar, ProgressRing } from '../ui/Progress'
import { StatCard } from '../ui/Misc'

export function StatsOverview() {
  const { data } = useData()
  const today = todayKey()
  const minutesToday = studyMinutesOn(data, today)
  const plannedToday = tasksOn(data, today).reduce((s, t) => s + (Number(t.durationMin) || 0), 0)
  const dailyTarget = Math.round((data.weeklyTargetHours * 60) / 7)
  const week = weekStats(data, today)
  const streak = currentStreak(data)
  const xp = totalXP(data)
  const level = levelInfo(xp)

  return (
    <section aria-label="Your progress" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 sm:col-span-1 lg:col-span-1">
        <ProgressRing value={minutesToday} max={dailyTarget} label="Today's study progress">
          <span className="text-sm font-semibold tabular-nums">{Math.round(Math.min(1, minutesToday / dailyTarget) * 100)}%</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Today</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{formatDuration(minutesToday)}</p>
          <p className="text-xs text-muted">
            of {formatDuration(dailyTarget)} daily pace
            {plannedToday > 0 && ` · ${formatDuration(plannedToday)} planned`}
          </p>
        </div>
      </div>

      <StatCard icon={CalendarClock} label="Weekly target" value={`${formatHours(week.minutes)} / ${data.weeklyTargetHours}h`} sub="completed study hours" className="col-span-2 sm:col-span-1">
        <ProgressBar value={week.minutes} max={data.weeklyTargetHours * 60} label="Weekly target progress" />
      </StatCard>

      <StatCard
        icon={Flame}
        tone="warn"
        label="Streak"
        value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
        sub={streak ? 'Keep it alive today' : 'Complete a task to start'}
      />

      <StatCard icon={Zap} tone="info" label="XP" value={xp.toLocaleString()} sub={`Level ${level.level}`}>
        <ProgressBar value={level.into} max={level.size} barClassName="bg-info" label="Progress to next level" />
      </StatCard>

    </section>
  )
}
