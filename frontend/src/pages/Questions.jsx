
import {
  ChevronLeft,
  ChevronRight,
  History,
  Minus,
  Plus,
  Target,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { BarChart } from '../components/ui/BarChart'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { EmptyState, PageHeader } from '../components/ui/Misc'
import { ProgressBar } from '../components/ui/Progress'
import { useData } from '../context/DataContext'
import {
  addDays,
  formatDate,
  relativeLabel,
  todayKey,
} from '../lib/dates'
import {
  categoryOn,
  questionsOn,
  totalQuestions,
  weekStats,
} from '../lib/stats'
import { cn } from '../lib/utils'

function CounterCard({ category, dateKey, disabled }) {
  const { data, setQuestionCount } = useData()

  const value = categoryOn(data, dateKey, category.id)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = (next) => {
    const parsed = Number.parseInt(next, 10)
    const count = Number.isNaN(parsed)
      ? 0
      : Math.max(0, Math.min(9999, parsed))

    setDraft(String(count))

    return setQuestionCount(dateKey, category.id, count)
  }

  const inputId = `count-${category.id}`

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="flex items-center gap-2 font-semibold"
        >
          <span
            className={cn(
              'size-2.5 rounded-full',
              category.color,
            )}
            aria-hidden="true"
          />
          {category.label}
        </label>

        <span className="text-xs text-muted">
          Goal {category.dailyGoal}/day
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="size-11"
          onClick={() => commit(value - 1)}
          disabled={disabled || value === 0}
          aria-label={`Decrease ${category.label}`}
        >
          <Minus className="size-4" aria-hidden="true" />
        </Button>

        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={0}
          max={9999}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.currentTarget.blur()
            }
          }}
          className="h-14 min-w-0 flex-1 rounded-xl border border-border bg-bg text-center font-display text-3xl font-semibold tabular-nums focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <Button
          variant="secondary"
          size="icon"
          className="size-11"
          onClick={() => commit(value + 1)}
          disabled={disabled}
          aria-label={`Increase ${category.label}`}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex gap-2">
        {[5, 10, 25].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => commit(value + n)}
            className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-fg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            +{n}
          </button>
        ))}
      </div>

      <ProgressBar
        value={value}
        max={category.dailyGoal}
        barClassName={category.color}
        label={`${category.label} goal progress`}
      />
    </div>
  )
}

export default function Questions() {
  const {
    data,
    goal,
    questionLoading,
    questionSaving,
    questionError,
    refreshQuestionData,
  } = useData()

  const today = todayKey()
  const [dateKey, setDateKey] = useState(today)

  // Fetch question logs and tracker configuration.
  useEffect(() => {
    refreshQuestionData()
  }, [refreshQuestionData])

  const week = weekStats(data, today)
  const dayTotal = questionsOn(data, dateKey)

  const history = Object.keys(data.questionLogs ?? {})
    .filter((key) => questionsOn(data, key) > 0)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 14)

  const isLoading = questionLoading

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          goal.unit === 'problems'
            ? 'Problem Tracker'
            : 'Question Tracker'
        }
        description={goal.description}
      />

      {/* API status */}
      {questionSaving && (
        <p
          className="text-xs text-muted"
          role="status"
          aria-live="polite"
        >
          Saving your progress...
        </p>
      )}

      {questionError && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p className="text-sm text-danger">
            {questionError}
          </p>

          <Button
            variant="secondary"
            size="sm"
            onClick={refreshQuestionData}
            disabled={questionLoading}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Date selector */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDateKey(addDays(dateKey, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>

        <div className="text-center">
          <p className="font-semibold">
            {relativeLabel(dateKey) ??
              formatDate(dateKey, { weekday: 'long' })}
          </p>

          <p className="text-xs text-muted">
            {formatDate(dateKey, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            · {dayTotal} {goal.unit}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDateKey(addDays(dateKey, 1))}
          disabled={dateKey >= today}
          aria-label="Next day"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Counters */}
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">
            Loading your question history...
          </p>
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-4',
            goal.categories.length === 3
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2',
          )}
        >
          {goal.categories.map((category) => (
            <CounterCard
              key={`${category.id}-${dateKey}`}
              category={category}
              dateKey={dateKey}
              disabled={isLoading}
            />
          ))}
        </div>
      )}

      {/* Weekly statistics and history */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            icon={Target}
            title="This week"
            description={`${week.questions} ${goal.unit} · ${totalQuestions(data)} all-time`}
          />

          {week.questions === 0 ? (
            <EmptyState
              icon={Target}
              title={`No ${goal.unit} logged this week`}
              description="Use the counters above — your chart fills in as you go."
            />
          ) : (
            <>
              <BarChart
                label={`${goal.unit} per day this week`}
                series={goal.categories}
                data={week.days.map((day) => ({
                  key: day.key,
                  label: formatDate(day.key, {
                    weekday: 'narrow',
                  }),
                  highlight: day.key === dateKey,
                  values: day.byCategory,
                }))}
              />

              <ul className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
                {goal.categories.map((category) => (
                  <li
                    key={category.id}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        category.color,
                      )}
                      aria-hidden="true"
                    />

                    {category.label}:{' '}
                    <span className="font-semibold text-fg tabular-nums">
                      {week.days.reduce(
                        (sum, day) =>
                          sum + (day.byCategory[category.id] ?? 0),
                        0,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader icon={History} title="History" />

          {isLoading ? (
            <p className="text-sm text-muted">
              Loading history...
            </p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted">
              No logs yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {history.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setDateKey(key)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm transition hover:text-accent',
                      key === dateKey && 'text-accent',
                    )}
                  >
                    <span>
                      {relativeLabel(key) ??
                        formatDate(key, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                    </span>

                    <span className="flex gap-3 tabular-nums text-muted">
                      {goal.categories.map((category) => (
                        <span
                          key={category.id}
                          className={category.text}
                        >
                          {categoryOn(data, key, category.id)}
                        </span>
                      ))}

                      <span className="w-10 text-right font-semibold text-fg">
                        {questionsOn(data, key)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
