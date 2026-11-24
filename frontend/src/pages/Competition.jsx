
import { useCallback, useEffect, useState } from 'react'
import {
  Crown,
  Swords,
  UserPlus,
  Clock3,
  Target,
  CalendarDays,
  RefreshCw,
} from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import {
  Avatar,
  Chip,
  EmptyState,
  PageHeader,
} from '../components/ui/Misc'

import { useData } from '../context/DataContext'
import friendService from '../services/friend.service'
import { formatDate } from '../lib/dates'
import { cn } from '../lib/utils'

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const formatStudyHours = (minutes = 0) => {
  const totalMinutes = Math.max(0, Number(minutes) || 0)
  const hours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(
    remainingMinutes,
  ).padStart(2, '0')}`
}

const formatNumber = (value = 0) => {
  return Number(value || 0).toLocaleString()
}

const getTotalQuestions = (weeklyMetrics = {}) => {
  return Object.values(weeklyMetrics).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  )
}

const getWinnerLabel = (winner, meName, friendName) => {
  if (winner === 'me') return `${meName} won`
  if (winner === 'friend') return `${friendName} won`
  if (winner === 'draw') return 'Draw'

  return 'No result'
}

const getWinnerStyle = (winner) => {
  if (winner === 'me') return 'text-accent bg-accent/10'
  if (winner === 'friend') return 'text-info bg-info/10'
  if (winner === 'draw') return 'text-warn bg-warn/10'

  return 'text-muted bg-surface-2'
}

const getPeriodLabel = (period) => {
  if (!period?.startDate || !period?.endDate) {
    return 'Weekly progress'
  }

  return `Weekly progress ${formatDate(period.startDate, {
    month: 'short',
    day: 'numeric',
  })} to ${formatDate(period.endDate, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
}

// --------------------------------------------------
// Metric comparison row
// --------------------------------------------------

function MetricRow({
  label,
  a = 0,
  b = 0,
  format = formatNumber,
}) {
  const valueA = Number(a) || 0
  const valueB = Number(b) || 0
  const max = Math.max(valueA, valueB, 1)

  const aWins = valueA > valueB
  const bWins = valueB > valueA

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
      {/* Your value */}
      <div className="flex min-w-0 flex-col items-end gap-1.5">
        <span
          className={cn(
            'font-display text-base font-semibold tabular-nums sm:text-lg',
            aWins ? 'text-accent' : 'text-muted',
          )}
        >
          {format(valueA)}
        </span>

        <div className="flex h-2 w-full justify-end overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${(valueA / max) * 100}%` }}
          />
        </div>
      </div>

      {/* Metric label */}
      <span className="w-20 text-center text-[10px] font-medium uppercase tracking-wider text-muted sm:w-28 sm:text-xs">
        {label}
      </span>

      {/* Partner value */}
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <span
          className={cn(
            'font-display text-base font-semibold tabular-nums sm:text-lg',
            bWins ? 'text-info' : 'text-muted',
          )}
        >
          {format(valueB)}
        </span>

        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-info transition-all duration-700"
            style={{ width: `${(valueB / max) * 100}%` }}
          />
        </div>
      </div>
    </li>
  )
}

// --------------------------------------------------
// Daily study chart
// --------------------------------------------------

function DailyStudyChart({ history }) {
  const maxMinutes = Math.max(
    1,
    ...history.flatMap((day) => [
      Number(day.me?.studyMinutes) || 0,
      Number(day.friend?.studyMinutes) || 0,
    ]),
  )

  const meTotal = history.reduce(
    (sum, day) => sum + (Number(day.me?.studyMinutes) || 0),
    0,
  )

  const friendTotal = history.reduce(
    (sum, day) => sum + (Number(day.friend?.studyMinutes) || 0),
    0,
  )

  return (
    <Card>
      <CardHeader
        title="Daily study time"
        description="Completed-task duration compared with your partner"
      />

      {history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No daily study data available yet.
        </p>
      ) : (
        <>
          <div
            className="flex h-40 w-full items-end gap-1.5 sm:gap-2"
            role="img"
            aria-label="Daily completed-task duration comparison"
          >
            {history.map((day) => {
              const meMinutes = Number(day.me?.studyMinutes) || 0
              const friendMinutes =
                Number(day.friend?.studyMinutes) || 0

              const meHeight = (meMinutes / maxMinutes) * 100
              const friendHeight =
                (friendMinutes / maxMinutes) * 100

              return (
                <div
                  key={day.dateKey}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  title={`${day.dateKey}: You ${formatStudyHours(
                    meMinutes,
                  )}, Partner ${formatStudyHours(friendMinutes)}`}
                >
                  <div className="flex h-32 w-full items-end justify-center gap-0.5">
                    <div
                      className="w-1/2 max-w-3 rounded-t bg-accent transition-all duration-700"
                      style={{ height: `${meHeight}%` }}
                    />

                    <div
                      className="w-1/2 max-w-3 rounded-t bg-info transition-all duration-700"
                      style={{ height: `${friendHeight}%` }}
                    />
                  </div>

                  <span className="text-[10px] text-muted sm:text-[11px]">
                    {formatDate(day.dateKey, {
                      weekday: 'narrow',
                    })}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-accent" />
              You · {formatStudyHours(meTotal)}
            </span>

            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-info" />
              Partner · {formatStudyHours(friendTotal)}
            </span>
          </div>
        </>
      )}
    </Card>
  )
}

// --------------------------------------------------
// Daily Duel history
// --------------------------------------------------

function DailyDuelHistory({
  history,
  meName,
  friendName,
}) {
  return (
    <Card>
      <CardHeader
        title="Daily Duel history"
        description="Daily winners based on completed-task duration and task completion"
      />

      {history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No Daily Duel results available yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {[...history].reverse().map((day) => (
            <div
              key={day.dateKey}
              className="rounded-xl border border-border p-3 sm:p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {formatDate(day.dateKey, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>

                <Chip>
                  {day.dateKey === history[history.length - 1]?.dateKey
                    ? 'Today'
                    : 'Finalized'}
                </Chip>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {/* Study time */}
                <div className="min-w-0 rounded-lg bg-surface-2 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                    <Clock3 className="size-3.5 shrink-0" />
                    Study time
                  </div>

                  <p className="mb-2 flex flex-wrap items-center gap-x-2 text-sm font-semibold tabular-nums">
                    <span>{formatStudyHours(day.me?.studyMinutes)}</span>
                    <span className="text-muted">vs</span>
                    <span>{formatStudyHours(day.friend?.studyMinutes)}</span>
                  </p>

                  <span
                    className={cn(
                      'inline-flex max-w-full rounded-full px-2 py-1 text-xs font-medium',
                      getWinnerStyle(day.winners?.studyHours),
                    )}
                  >
                    {getWinnerLabel(
                      day.winners?.studyHours,
                      meName,
                      friendName,
                    )}
                  </span>
                </div>

                {/* Goal completion */}
                <div className="min-w-0 rounded-lg bg-surface-2 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                    <Target className="size-3.5 shrink-0" />
                    Goal completion
                  </div>

                  <p className="mb-2 flex flex-wrap items-center gap-x-2 text-sm font-semibold tabular-nums">
                    <span>{day.me?.completionRate ?? 0}%</span>
                    <span className="text-muted">vs</span>
                    <span>{day.friend?.completionRate ?? 0}%</span>
                  </p>

                  <p className="mb-2 flex flex-wrap gap-x-2 text-xs text-muted">
                    <span>
                      {day.me?.completedTasks ?? 0}/
                      {day.me?.totalTasks ?? 0} tasks
                    </span>
                    <span>vs</span>
                    <span>
                      {day.friend?.completedTasks ?? 0}/
                      {day.friend?.totalTasks ?? 0} tasks
                    </span>
                  </p>

                  <span
                    className={cn(
                      'inline-flex max-w-full rounded-full px-2 py-1 text-xs font-medium',
                      getWinnerStyle(day.winners?.goalCompletion),
                    )}
                  >
                    {getWinnerLabel(
                      day.winners?.goalCompletion,
                      meName,
                      friendName,
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// --------------------------------------------------
// Main Competition page
// --------------------------------------------------

export default function Competition() {
  const { user, friend } = useData()

  const [comparison, setComparison] = useState(null)
  const [dailyDuel, setDailyDuel] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const friendId = friend?._id || friend?.id

  // --------------------------------------------------
  // Fetch competition data
  // --------------------------------------------------

  const fetchCompetitionData = useCallback(async () => {
    if (!friendId) {
      setComparison(null)
      setDailyDuel(null)
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')

    try {
      const [weeklyResponse, dailyResponse] = await Promise.all([
        friendService.compareFriend(friendId),
        friendService.getDailyDuel(friendId, 7),
      ])

      setComparison(weeklyResponse)
      setDailyDuel(dailyResponse)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Unable to load competition data.',
      )
    } finally {
      setLoading(false)
    }
  }, [friendId])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!friendId) {
        setComparison(null)
        setDailyDuel(null)
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      setError('')

      try {
        const [weeklyResponse, dailyResponse] = await Promise.all([
          friendService.compareFriend(friendId),
          friendService.getDailyDuel(friendId, 7),
        ])

        if (!active) return

        setComparison(weeklyResponse)
        setDailyDuel(dailyResponse)
      } catch (err) {
        if (!active) return

        setError(
          err.response?.data?.message ||
            err.message ||
            'Unable to load competition data.',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [friendId])

  // --------------------------------------------------
  // No partner
  // --------------------------------------------------

  if (!friend) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Competition"
          description="Compete with your study partner every week."
        />

        <EmptyState
          icon={Swords}
          title="No study partner yet"
          description="Invite a friend to unlock weekly comparisons and Daily Duels."
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

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Competition"
          description="Loading your competition statistics..."
        />

        <Card>
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted">
            <RefreshCw className="size-4 animate-spin" />
            Loading competition data...
          </div>
        </Card>
      </div>
    )
  }

  // --------------------------------------------------
  // Error state
  // --------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Competition"
          description="Your study competition"
        />

        <Card>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-muted">{error}</p>

            <Button onClick={fetchCompetitionData}>
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // --------------------------------------------------
  // Backend response data
  // --------------------------------------------------

  const me = comparison?.me ?? {}
  const them = comparison?.friend ?? {}

  const history = dailyDuel?.history ?? []

  const meName = me.name || user?.name || 'You'
  const friendName = them.name || friend?.name || 'Partner'

  const metrics = [
    {
      key: 'studyMinutes',
      label: 'Study time',
      a: me.totalStudyMinutes || 0,
      b: them.totalStudyMinutes || 0,
      format: formatStudyHours,
    },
    {
      key: 'questions',
      label: 'Questions',
      a: getTotalQuestions(me.weeklyMetrics),
      b: getTotalQuestions(them.weeklyMetrics),
      format: formatNumber,
    },
    {
      key: 'activeDays',
      label: 'Active days',
      a: me.activeDays || 0,
      b: them.activeDays || 0,
      format: (value) => `${value}/7`,
    },
    {
      key: 'totalSessions',
      label: 'Sessions',
      a: me.totalSessions || 0,
      b: them.totalSessions || 0,
      format: formatNumber,
    },
  ]

  const myWins = metrics.filter(
    (metric) => metric.a > metric.b,
  ).length

  const theirWins = metrics.filter(
    (metric) => metric.b > metric.a,
  ).length

  const leader =
    myWins === theirWins
      ? null
      : myWins > theirWins
        ? 'me'
        : 'friend'

  const periodLabel = getPeriodLabel(comparison?.period)

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PageHeader
        title={periodLabel}
        description="Compare your study performance with your partner."
      />

      {/* Weekly comparison */}
      <Card className="overflow-hidden">
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:mb-6 sm:gap-4">
          {/* Current user */}
          <div className="flex min-w-0 flex-col items-center gap-2 text-center">
            <div className="relative">
              <Avatar name={meName} size="lg" />

              {leader === 'me' && (
                <Crown
                  className="absolute -right-1 -top-3 size-5 rotate-12 text-warn sm:size-6"
                  aria-label="Leading"
                />
              )}
            </div>

            <p className="max-w-full truncate text-sm font-semibold sm:text-base">
              You
            </p>

            <Chip>{me.goal || user?.goal || 'Student'}</Chip>
          </div>

          {/* Score */}
          <div className="flex min-w-0 flex-col items-center gap-1">
            <span className="font-display text-2xl font-bold tabular-nums sm:text-3xl">
              <span className="text-accent">{myWins}</span>
              <span className="mx-1 text-muted sm:mx-1.5">–</span>
              <span className="text-info">{theirWins}</span>
            </span>

            <span className="text-center text-[10px] text-muted sm:text-xs">
              Categories won
            </span>
          </div>

          {/* Friend */}
          <div className="flex min-w-0 flex-col items-center gap-2 text-center">
            <div className="relative">
              <Avatar
                name={friendName}
                size="lg"
                className="bg-info/15 text-info ring-info/25"
              />

              {leader === 'friend' && (
                <Crown
                  className="absolute -right-1 -top-3 size-5 rotate-12 text-warn sm:size-6"
                  aria-label="Leading"
                />
              )}
            </div>

            <p className="max-w-full truncate text-sm font-semibold sm:text-base">
              {friendName}
            </p>

            <Chip>{them.goal || friend?.goal || 'Student'}</Chip>
          </div>
        </div>

        <p
          className="mb-5 text-center text-xs font-medium sm:mb-6 sm:text-sm"
          aria-live="polite"
        >
          {leader === 'me'
            ? "You're leading this week. Keep the pressure on."
            : leader === 'friend'
              ? `${friendName.split(' ')[0]} is ahead. Time to close the gap.`
              : 'Dead even. Keep pushing!'}
        </p>

        <ul className="flex flex-col gap-5 sm:gap-6">
          {metrics.map((metric) => (
            <MetricRow
              key={metric.key}
              label={metric.label}
              a={metric.a}
              b={metric.b}
              format={metric.format}
            />
          ))}
        </ul>
      </Card>

      {/* Weekly leaderboard and daily chart */}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader
            title="Weekly leaderboard"
            description="Ranked by weekly comparison categories"
          />

          {[
            {
              id: 'me',
              name: `${meName} (you)`,
              wins: myWins,
              color: 'bg-accent',
            },
            {
              id: 'friend',
              name: friendName,
              wins: theirWins,
              color: 'bg-info',
            },
          ]
            .sort((a, b) => b.wins - a.wins)
            .map((row, index) => (
              <div
                key={row.id}
                className={cn(
                  'mb-2 flex min-w-0 items-center gap-3 rounded-xl border p-3',
                  index === 0 && row.wins > 0
                    ? 'border-warn/30 bg-warn/5'
                    : 'border-border',
                )}
              >
                <span
                  className={cn(
                    'w-6 shrink-0 text-center font-display text-lg font-bold',
                    index === 0 && row.wins > 0
                      ? 'text-warn'
                      : 'text-muted',
                  )}
                >
                  {index + 1}
                </span>

                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    row.color,
                  )}
                />

                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {row.name}
                </p>

                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {row.wins} {row.wins === 1 ? 'win' : 'wins'}
                </span>
              </div>
            ))}

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Categories: study time, questions solved, active days and study sessions.
          </p>
        </Card>

        <DailyStudyChart history={history} />
      </div>

      {/* Daily Duel results */}
      <DailyDuelHistory
        history={history}
        meName={dailyDuel?.me?.name || meName}
        friendName={dailyDuel?.friend?.name || friendName}
      />

      {/* Comparison period information */}
      <Card>
        <div className="flex min-w-0 items-start gap-3">
          <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted" />

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {periodLabel}
            </p>

            {comparison?.period?.startDate &&
              comparison?.period?.endDate && (
                <p className="mt-1 break-words text-xs text-muted">
                  {comparison.period.startDate} – {comparison.period.endDate}
                </p>
              )}
          </div>
        </div>
      </Card>
    </div>
  )
}
