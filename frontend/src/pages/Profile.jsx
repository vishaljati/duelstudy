import { CalendarDays, Clock, Flame, Lock, LogOut, Mail, Target, Trophy, Zap } from 'lucide-react'
import { useNavigate } from 'react-router'
import { WeeklyTarget } from '../components/planner/WeeklyTarget'
import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Avatar, Chip } from '../components/ui/Misc'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { formatHours, todayKey } from '../lib/dates'
import { completedTasks, currentStreak, levelInfo, longestStreak, totalQuestions, totalXP } from '../lib/stats'

export default function Profile() {
  const { logout } = useAuth()
  const { user, data, goal, friend } = useData()
  const navigate = useNavigate()
  const xp = totalXP(data)
  const done = completedTasks(data)
  const totalMin = done.reduce((s, t) => s + (Number(t.durationMin) || 0), 0)

  const stats = [
    { icon: Clock, label: 'Hours studied', value: formatHours(totalMin) },
    { icon: CalendarDays, label: 'Tasks completed', value: done.length },
    { icon: Target, label: `${goal.unit[0].toUpperCase()}${goal.unit.slice(1)} solved`, value: totalQuestions(data) },
    { icon: Flame, label: 'Current streak', value: `${currentStreak(data)}d` },
    { icon: Trophy, label: 'Best streak', value: `${longestStreak(data)}d` },
    { icon: Zap, label: 'Level', value: levelInfo(xp).level },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Mail className="size-3.5" aria-hidden="true" />
            {user.email}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip className="border-accent/25 bg-accent/10 text-accent">
              <Lock className="size-3" aria-hidden="true" />
              {goal.label} · {goal.tagline}
            </Chip>
            <Chip>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Chip>
            <Chip className="font-mono">{user.inviteCode}</Chip>
            {friend && <Chip>Partner: {friend.name}</Chip>}
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            logout()
            navigate('/', { replace: true })
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </Button>
      </Card>

      <section aria-label="Lifetime stats" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
              <p className="truncate text-xs text-muted">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <WeeklyTarget anchorKey={todayKey()} />
          <Card>
            <CardHeader title="Academic goal" />
            <p className="text-sm text-muted text-pretty">
              Your goal was set to <span className="font-semibold text-fg">{goal.label}</span> when you signed up. It&apos;s permanent so your
              history and competitions stay comparable.
            </p>
          </Card>
        </div>
        <ActivityFeed limit={10} />
      </div>
    </div>
  )
}
