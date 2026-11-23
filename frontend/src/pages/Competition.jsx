import { Crown, Swords, UserPlus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Avatar, Chip, EmptyState, PageHeader } from '../components/ui/Misc'
import { useData } from '../context/DataContext'
import { GOALS } from '../lib/constants'
import { addDays, formatDate, formatHours, startOfWeek, todayKey } from '../lib/dates'
import { currentStreak, weekStats, weeklyXP } from '../lib/stats'
import { cn } from '../lib/utils'

function summarize(data) {
  const week = weekStats(data)
  return {
    week,
    hours: week.minutes,
    questions: week.questions,
    tasks: week.tasksDone,
    streak: currentStreak(data),
    xp: weeklyXP(data),
  }
}

function MetricRow({ label, a, b, format = (v) => v }) {
  const max = Math.max(a, b, 1)
  const aWins = a > b
  const bWins = b > a
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="flex flex-col items-end gap-1.5">
        <span className={cn('font-display text-lg font-semibold tabular-nums', aWins ? 'text-accent' : 'text-muted')}>{format(a)}</span>
        <div className="flex h-2 w-full justify-end overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${(a / max) * 100}%` }} />
        </div>
      </div>
      <span className="w-24 text-center text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
      <div className="flex flex-col items-start gap-1.5">
        <span className={cn('font-display text-lg font-semibold tabular-nums', bWins ? 'text-info' : 'text-muted')}>{format(b)}</span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-info transition-all duration-700" style={{ width: `${(b / max) * 100}%` }} />
        </div>
      </div>
    </li>
  )
}

export default function Competition() {
  const { user, data, friend, friendData } = useData()

  if (!friend || !friendData) {
    return (
      <div>
        <PageHeader title="Competition" description="Compete with your study partner every week." />
        <EmptyState
          icon={Swords}
          title="No study partner yet"
          description="Invite a friend with your code to unlock a weekly head-to-head leaderboard."
          action={
            <Button as={Link} to="/friends">
              <UserPlus className="size-4" aria-hidden="true" />
              Find a partner
            </Button>
          }
        />
      </div>
    )
  }

  const me = summarize(data)
  const them = summarize(friendData)
  const metrics = [
    { key: 'hours', label: 'Study hours', format: formatHours },
    { key: 'questions', label: GOALS[user.goal].unit === GOALS[friend.goal].unit ? GOALS[user.goal].unit : 'Solved' },
    { key: 'tasks', label: 'Tasks done' },
    { key: 'streak', label: 'Streak', format: (v) => `${v}d` },
    { key: 'xp', label: 'Weekly XP' },
  ]
  const myWins = metrics.filter((m) => me[m.key] > them[m.key]).length
  const theirWins = metrics.filter((m) => them[m.key] > me[m.key]).length
  const leader = myWins === theirWins ? null : myWins > theirWins ? 'me' : 'them'
  const weekStart = startOfWeek(todayKey())

  const board = [
    { id: 'me', name: `${user.name} (you)`, goal: user.goal, s: me, color: 'bg-accent' },
    { id: 'them', name: friend.name, goal: friend.goal, s: them, color: 'bg-info' },
  ].sort((a, b) => b.s.xp - a.s.xp)

  const maxDay = Math.max(1, ...me.week.days.map((d) => d.minutes), ...them.week.days.map((d) => d.minutes))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Competition"
        description={`Week of ${formatDate(weekStart, { month: 'short', day: 'numeric' })} – ${formatDate(addDays(weekStart, 6), { month: 'short', day: 'numeric' })}`}
      />

      <Card className="overflow-hidden">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative">
              <Avatar name={user.name} size="lg" />
              {leader === 'me' && <Crown className="absolute -right-1 -top-3 size-6 rotate-12 text-warn" aria-label="Leading" />}
            </div>
            <p className="font-semibold">You</p>
            <Chip>{user.goal}</Chip>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-3xl font-bold tabular-nums">
              <span className="text-accent">{myWins}</span>
              <span className="mx-1.5 text-muted">–</span>
              <span className="text-info">{theirWins}</span>
            </span>
            <span className="text-xs text-muted">categories won</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative">
              <Avatar name={friend.name} size="lg" className="bg-info/15 text-info ring-info/25" />
              {leader === 'them' && <Crown className="absolute -right-1 -top-3 size-6 rotate-12 text-warn" aria-label="Leading" />}
            </div>
            <p className="max-w-full truncate font-semibold">{friend.name}</p>
            <Chip>{friend.goal}</Chip>
          </div>
        </div>
        <p className="mb-6 text-center text-sm font-medium" aria-live="polite">
          {leader === 'me' ? 'You’re leading this week — keep the pressure on.' : leader === 'them' ? `${friend.name.split(' ')[0]} is ahead. Time to close the gap.` : 'Dead even. Next task decides it.'}
        </p>
        <ul className="flex flex-col gap-5">
          {metrics.map((m) => (
            <MetricRow key={m.key} label={m.label} a={me[m.key]} b={them[m.key]} format={m.format} />
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weekly leaderboard" description="Ranked by XP earned this week" />
          <ol className="flex flex-col gap-2">
            {board.map((row, i) => (
              <li key={row.id} className={cn('flex items-center gap-3 rounded-xl border p-3', i === 0 ? 'border-warn/30 bg-warn/5' : 'border-border')}>
                <span className={cn('w-6 text-center font-display text-lg font-bold', i === 0 ? 'text-warn' : 'text-muted')}>{i + 1}</span>
                <span className={cn('size-2 rounded-full', row.color)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.name}</p>
                  <p className="text-xs text-muted">
                    {formatHours(row.s.hours)} · {row.s.questions} solved · {row.s.streak}d streak
                  </p>
                </div>
                <span className="font-display font-semibold tabular-nums">{row.s.xp} XP</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardHeader title="Daily study hours" description="You vs. your partner" />
          <div className="flex h-40 items-end gap-2" role="img" aria-label="Side-by-side daily study hours for this week">
            {me.week.days.map((d, i) => {
              const t = them.week.days[i]
              return (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-32 w-full items-end justify-center gap-0.5">
                    <div className="w-1/2 max-w-3 rounded-t bg-accent transition-all duration-700" style={{ height: `${(d.minutes / maxDay) * 100}%` }} />
                    <div className="w-1/2 max-w-3 rounded-t bg-info transition-all duration-700" style={{ height: `${(t.minutes / maxDay) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-muted">{formatDate(d.key, { weekday: 'narrow' })}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
              You · {formatHours(me.hours)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-info" aria-hidden="true" />
              {friend.name.split(' ')[0]} · {formatHours(them.hours)}
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
