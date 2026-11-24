
import {
  CircleCheck,
  Flame,
  History,
  ListChecks,
  Lock,
  Sword,
  Shield,
  Crown,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'

import { Card, CardHeader } from '../components/ui/Card'
import { PageHeader } from '../components/ui/Misc'
import { ProgressBar, ProgressRing } from '../components/ui/Progress'
import { useData } from '../context/DataContext'

import { timeAgo } from '../lib/dates'

import {
  getBadges,
  STREAK_RANKS,
  dailyChallenges,
  weeklyChallenges,
} from '../lib/rewards'

import {
  currentStreak,
  levelInfo,
  longestStreak,
  totalXP,
} from '../lib/stats'

import { cn } from '../lib/utils'

// --------------------------------------------------
// Icons
// --------------------------------------------------

const ICONS = {
  CircleCheck,
  ListChecks,
  Target,
  Zap,
  Flame,
  Trophy,
  Sword,
  Shield,
  Crown,
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getRewardRecords = (data) =>
  Array.isArray(data.rewardData?.rewards)
    ? data.rewardData.rewards
    : []

const getRewardMap = (data) =>
  new Map(
    getRewardRecords(data).map((reward) => [
      reward.rewardKey,
      reward,
    ])
  )

const getEarnedDate = (reward) => {
  if (!reward?.unlockedAt) return null

  const date = new Date(reward.unlockedAt)

  return Number.isNaN(date.getTime()) ? null : date
}

// --------------------------------------------------
// Challenge list
// --------------------------------------------------

function ChallengeList({ items = [] }) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted">
        No challenges available.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {items.map((challenge) => (
        <li key={challenge.key}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
            <span
              className={cn(
                'flex items-center gap-2 font-medium',
                challenge.done && 'text-accent'
              )}
            >
              {challenge.done && (
                <CircleCheck className="size-4" />
              )}

              {challenge.title}
            </span>

            <span className="shrink-0 text-xs tabular-nums text-muted">
              {Math.min(challenge.progress, challenge.goal)}
              {challenge.unit ?? ''}
              /{challenge.goal}
              {challenge.unit ?? ''}
              {' · '}
              +{challenge.xp} XP
            </span>
          </div>

          <ProgressBar
            value={challenge.progress}
            max={challenge.goal}
            label={challenge.title}
          />
        </li>
      ))}
    </ul>
  )
}

// --------------------------------------------------
// Streak ranks
// --------------------------------------------------

function RankSection({
  streak,
  best,
  rewardMap,
}) {
  const currentRank = [...STREAK_RANKS]
    .reverse()
    .find((rank) => streak >= rank.days)

  const bestRank = [...STREAK_RANKS]
    .reverse()
    .find(
      (rank) =>
        best >= rank.days ||
        rewardMap.has(`rank:${rank.id}`)
    )

  const nextRank = STREAK_RANKS.find(
    (rank) => rank.days > streak
  )

  const progress = nextRank
    ? Math.min((streak / nextRank.days) * 100, 100)
    : 100

  return (
    <Card className="flex flex-col gap-5">
      <CardHeader
        icon={Flame}
        title="Your rank"
        description="Build your streak and climb the ranks."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-warn/10 text-warn">
          {currentRank ? (
            (() => {
              const Icon = ICONS[currentRank.icon] ?? Sword
              return <Icon className="size-9" />
            })()
          ) : (
            <Flame className="size-9" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-muted">
            Current rank
          </p>

          <h3 className="font-display text-2xl font-bold">
            {currentRank?.title ?? 'Unranked'}
          </h3>

          <p className="text-sm text-muted">
            {streak} consecutive study days
          </p>

          <p className="mt-1 text-xs text-muted">
            Best streak: {best} days
            {bestRank && ` · Highest rank: ${bestRank.title}`}
          </p>
        </div>
      </div>

      {nextRank ? (
        <div className="space-y-2">
          <div className="flex justify-between gap-2 text-sm">
            <span className="font-medium">
              Next: {nextRank.title}
            </span>

            <span className="text-muted tabular-nums">
              {streak}/{nextRank.days} days
            </span>
          </div>

          <ProgressBar
            value={progress}
            max={100}
            label="Next rank progress"
          />

          <p className="text-xs text-muted">
            {nextRank.days - streak} more consecutive days to
            unlock {nextRank.title}.
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium text-accent">
          Maximum rank achieved. You're Immortal!
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STREAK_RANKS.map((rank) => {
          const achieved =
            rewardMap.has(`rank:${rank.id}`) ||
            best >= rank.days

          const Icon = ICONS[rank.icon] ?? Sword

          return (
            <div
              key={rank.id}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border p-3 text-center',
                achieved
                  ? 'border-warn/30 bg-warn/10 text-warn'
                  : 'border-border text-muted'
              )}
            >
              {achieved ? (
                <Icon className="size-5" />
              ) : (
                <Lock className="size-4" />
              )}

              <span className="text-xs font-semibold">
                {rank.title}
              </span>

              <span className="text-[10px]">
                {rank.days} days
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// --------------------------------------------------
// Badge card
// --------------------------------------------------

function BadgeCard({ badge, unlock, locked = false }) {
  const Icon = ICONS[badge.icon] ?? Trophy

  const progress = Math.max(
    0,
    Number(badge.progressValue) || 0
  )

  const earnedDate = getEarnedDate(unlock)

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-4 transition',
        locked
          ? 'border-border bg-surface'
          : 'border-accent/30 bg-accent/5'
      )}
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-2xl',
          locked
            ? 'bg-surface-2 text-muted'
            : 'bg-accent text-accent-fg'
        )}
      >
        {locked ? (
          <Lock className="size-4" />
        ) : (
          <Icon className="size-5" />
        )}
      </span>

      <div>
        <p
          className={cn(
            'font-semibold',
            locked && 'text-muted'
          )}
        >
          {badge.title}
        </p>

        <p className="text-xs text-muted text-pretty">
          {badge.description}
        </p>
      </div>

      {locked ? (
        <div className="mt-auto space-y-2">
          <div className="flex justify-between gap-2 text-xs text-muted">
            <span>
              {Math.min(progress, badge.goal)} / {badge.goal}{' '}
              {badge.unit}
            </span>

            <span>+{badge.xp} XP</span>
          </div>

          <ProgressBar
            value={progress}
            max={badge.goal}
            label={badge.title}
          />
        </div>
      ) : (
        <p className="mt-auto text-xs font-semibold text-accent">
          {earnedDate
            ? `Earned ${timeAgo(earnedDate)}`
            : 'Achievement unlocked'}
        </p>
      )}
    </li>
  )
}

// --------------------------------------------------
// Reward history
// --------------------------------------------------

function RewardHistory({ rewards }) {
  const history = [...rewards]
    .sort(
      (a, b) =>
        new Date(b.unlockedAt).getTime() -
        new Date(a.unlockedAt).getTime()
    )
    .slice(0, 25)

  return (
    <Card>
      <CardHeader
        icon={History}
        title="Reward history"
      />

      {history.length === 0 ? (
        <p className="text-sm text-muted">
          Complete tasks or reach milestones to earn your first
          reward.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {history.map((item) => {
            const earnedDate = getEarnedDate(item)

            return (
              <li
                key={item._id ?? item.rewardKey}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate">
                    {item.label}
                  </p>

                  <p className="text-xs text-muted">
                    {earnedDate
                      ? timeAgo(earnedDate)
                      : 'Achievement unlocked'}
                  </p>
                </div>

                <span className="shrink-0 font-semibold tabular-nums text-accent">
                  +{Number(item.xp) || 0} XP
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// --------------------------------------------------
// Main page
// --------------------------------------------------

export default function Rewards() {
  const { data } = useData()

  const rewardRecords = getRewardRecords(data)
  const rewardMap = getRewardMap(data)

  const xp = totalXP(data)
  const level = levelInfo(xp)

  const streak = currentStreak(data)
  const best = longestStreak(data)

  const dailyItems = dailyChallenges(data)
  const weeklyItems = weeklyChallenges(data)

  const badges = getBadges(data.goal).map((badge) => ({
    ...badge,
    progressValue: badge.progress({ data }),
  }))

  const unlockedBadges = badges.filter((badge) =>
    rewardMap.has(`badge:${badge.id}`)
  )

  const lockedBadges = badges.filter(
    (badge) => !rewardMap.has(`badge:${badge.id}`)
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rewards"
        description="Earn XP, climb ranks, unlock achievements and complete challenges."
      />

      {/* XP overview */}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 sm:col-span-2">
          <ProgressRing
            value={level.into}
            max={level.size}
            size={88}
            stroke={8}
            label="Level progress"
          >
            <span className="text-center">
              <span className="block text-[10px] uppercase tracking-wider text-muted">
                Level
              </span>

              <span className="font-display text-2xl font-bold">
                {level.level}
              </span>
            </span>
          </ProgressRing>

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted">
              Total XP
            </p>

            <p className="font-display text-3xl font-bold tabular-nums text-accent">
              {xp.toLocaleString()}
            </p>

            <p className="text-sm text-muted">
              {level.size - level.into} XP to level{' '}
              {level.level + 1}
              {' · '}
              10 XP per task, 2 XP per question
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-warn/10 text-warn">
            <Flame className="size-6" />
          </span>

          <div>
            <p className="font-display text-2xl font-bold tabular-nums">
              {streak} days
            </p>

            <p className="text-sm text-muted">
              Best: {best} days
            </p>
          </div>
        </Card>
      </div>

      {/* Streak ranks */}

      <RankSection
        streak={streak}
        best={best}
        rewardMap={rewardMap}
      />

      {/* Challenges */}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Daily challenges"
            description="Reset every day"
          />

          <ChallengeList items={dailyItems} />
        </Card>

        <Card>
          <CardHeader
            title="Weekly challenges"
            description="Reset every Monday"
          />

          <ChallengeList items={weeklyItems} />
        </Card>
      </div>

      {/* Unlocked badges */}

      <section aria-labelledby="unlocked-badges-title">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <div>
            <h2
              id="unlocked-badges-title"
              className="text-lg font-semibold"
            >
              Achieved badges
            </h2>

            <p className="text-sm text-muted">
              Your earned achievements.
            </p>
          </div>

          <span className="shrink-0 text-sm font-medium text-accent">
            {unlockedBadges.length}/{badges.length}
          </span>
        </div>

        {unlockedBadges.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Trophy className="size-8 text-muted" />

              <p className="font-medium">
                No badges earned yet
              </p>

              <p className="text-sm text-muted">
                Complete tasks and reach milestones to earn your
                first badge.
              </p>
            </div>
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {unlockedBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                unlock={rewardMap.get(`badge:${badge.id}`)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Locked badges */}

      <section aria-labelledby="locked-badges-title">
        <div className="mb-3">
          <h2
            id="locked-badges-title"
            className="text-lg font-semibold"
          >
            Locked badges
          </h2>

          <p className="text-sm text-muted">
            Keep progressing to unlock these achievements.
          </p>
        </div>

        {lockedBadges.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm font-medium text-accent">
              All achievements unlocked. Outstanding!
            </p>
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {lockedBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                locked
              />
            ))}
          </ul>
        )}
      </section>

      {/* Reward history */}

      <RewardHistory rewards={rewardRecords} />
    </div>
  )
}
