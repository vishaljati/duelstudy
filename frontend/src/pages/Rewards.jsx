import { CircleCheck, Flame, History, ListChecks, Lock, Swords, Target, Trophy, Zap } from 'lucide-react'
import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/Misc'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { useData } from '../context/DataContext'
import { timeAgo } from '../lib/dates'
import { BADGES, STREAK_MILESTONES, dailyChallenges, rewardHistory, weeklyChallenges } from '../lib/rewards'
import { currentStreak, levelInfo, longestStreak, totalXP } from '../lib/stats'
import { cn } from '../lib/utils'

const BADGE_ICONS = { CircleCheck, ListChecks, Target, Zap, Flame, Trophy, Swords }

function ChallengeList({ items }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((c) => (
        <li key={c.id}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
            <span className={cn('flex items-center gap-2 font-medium', c.done && 'text-accent')}>
              {c.done && <CircleCheck className="size-4" aria-hidden="true" />}
              {c.title}
            </span>
            <span className="text-xs tabular-nums text-muted">
              {Math.min(c.progress, c.goal)}
              {c.unit ?? ''}/{c.goal}
              {c.unit ?? ''} · +{c.xp} XP
            </span>
          </div>
          <ProgressBar value={c.progress} max={c.goal} label={c.title} />
        </li>
      ))}
    </ul>
  )
}

export default function Rewards() {
  const { data } = useData()
  const xp = totalXP(data)
  const level = levelInfo(xp)
  const streak = currentStreak(data)
  const best = longestStreak(data)
  const history = rewardHistory(data, 25)
  const earned = BADGES.filter((b) => data.unlocked?.[`badge:${b.id}`]).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Rewards" description="Earn XP for every task and question. Unlock badges and clear challenges." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 sm:col-span-2">
          <ProgressRing value={level.into} max={level.size} size={88} stroke={8} label="Level progress">
            <span className="text-center">
              <span className="block text-[10px] uppercase tracking-wider text-muted">Level</span>
              <span className="font-display text-2xl font-bold">{level.level}</span>
            </span>
          </ProgressRing>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Total XP</p>
            <p className="font-display text-3xl font-bold tabular-nums text-accent">{xp.toLocaleString()}</p>
            <p className="text-sm text-muted">
              {level.size - level.into} XP to level {level.level + 1} · 10 XP per task, 2 XP per question
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-warn/10 text-warn">
            <Flame className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold tabular-nums">{streak} days</p>
            <p className="text-sm text-muted">Best: {best} days</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Daily challenges" description="Reset every day" />
          <ChallengeList items={dailyChallenges(data)} />
        </Card>
        <Card>
          <CardHeader title="Weekly challenges" description="Reset every Monday" />
          <ChallengeList items={weeklyChallenges(data)} />
        </Card>
      </div>

      <Card>
        <CardHeader icon={Flame} title="Streak milestones" />
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {STREAK_MILESTONES.map((m) => {
            const hit = best >= m
            return (
              <li key={m} className={cn('flex flex-col items-center gap-1 rounded-xl border py-3', hit ? 'border-warn/30 bg-warn/10 text-warn' : 'border-border text-muted')}>
                {hit ? <Flame className="size-5" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                <span className="font-display font-semibold">{m}d</span>
                <span className="sr-only">{hit ? 'reached' : 'locked'}</span>
              </li>
            )
          })}
        </ol>
      </Card>

      <section aria-labelledby="badges-title">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="badges-title" className="text-lg font-semibold">
            Badges
          </h2>
          <span className="text-sm text-muted">
            {earned}/{BADGES.length} unlocked
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {BADGES.map((b) => {
            const Icon = BADGE_ICONS[b.icon] ?? Trophy
            const unlocked = data.unlocked?.[`badge:${b.id}`]
            return (
              <li key={b.id} className={cn('flex flex-col gap-3 rounded-2xl border p-4 transition', unlocked ? 'border-accent/30 bg-accent/5' : 'border-border bg-surface')}>
                <span className={cn('flex size-11 items-center justify-center rounded-2xl', unlocked ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-muted')}>
                  {unlocked ? <Icon className="size-5" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                </span>
                <div>
                  <p className={cn('font-semibold', !unlocked && 'text-muted')}>{b.title}</p>
                  <p className="text-xs text-muted text-pretty">{b.description}</p>
                </div>
                <p className={cn('mt-auto text-xs font-semibold', unlocked ? 'text-accent' : 'text-muted')}>
                  {unlocked ? `Earned ${timeAgo(unlocked.ts)}` : `+${b.xp} XP`}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <Card>
        <CardHeader icon={History} title="Reward history" />
        {history.length === 0 ? (
          <p className="text-sm text-muted">Complete a task or log questions to earn your first XP.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{h.label}</p>
                  <p className="text-xs text-muted">{timeAgo(h.ts)}</p>
                </div>
                <span className={cn('shrink-0 font-semibold tabular-nums', h.special ? 'text-warn' : 'text-accent')}>+{h.xp} XP</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
