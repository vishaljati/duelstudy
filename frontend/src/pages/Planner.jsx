
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { TaskFormModal } from '../components/planner/TaskFormModal'
import { TaskItem } from '../components/planner/TaskItem'
import { WeeklyTarget } from '../components/planner/WeeklyTarget'
import { Button } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/Modal'
import { EmptyState, PageHeader } from '../components/ui/Misc'
import { useData } from '../context/DataContext'
import {
  addDays,
  formatDate,
  formatDuration,
  relativeLabel,
  startOfWeek,
  todayKey,
  weekKeys,
} from '../lib/dates'
import { cn } from '../lib/utils'

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
}

const getTaskDateKey = (task) =>
  String(task.scheduledDate).slice(0, 10)

export default function Planner() {
  const {
    data,
    toggleTask,
    deleteTask,
    refreshPlannerData,
    tasksLoading,
    tasksError,
  } = useData()

  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const [modal, setModal] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const days = weekKeys(selected)
  const weekStart = startOfWeek(selected)

  // Fetch the selected week's tasks and progress.
  useEffect(() => {
    refreshPlannerData(weekStart).catch(() => { })
  }, [weekStart, refreshPlannerData])

  const tasks = useMemo(() => {
    return data.tasks
      .filter((task) => getTaskDateKey(task) === selected)
      .sort(
        (a, b) =>
          Number(a.status === 'completed') -
          Number(b.status === 'completed') ||
          (a.scheduledTime || '99:99').localeCompare(
            b.scheduledTime || '99:99'
          ) ||
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      )
  }, [data.tasks, selected])

  const doneMin = tasks
    .filter((task) => task.status === 'completed')
    .reduce((sum, task) => sum + Number(task.durationMinutes || 0), 0)

  const totalMin = tasks.reduce(
    (sum, task) => sum + Number(task.durationMinutes || 0),
    0
  )

  const getDayTasks = (key) =>
    data.tasks.filter((task) => getTaskDateKey(task) === key)

  const handleDelete = async () => {
    if (!toDelete) return

    try {
      await deleteTask(toDelete._id)
      setToDelete(null)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  return (
    <div>
      <PageHeader
        title="Weekly Planner"
        description="Plan each day, then check tasks off to earn study hours and XP."
        action={
          <Button onClick={() => setModal({ task: null })}>
            <Plus className="size-4" aria-hidden="true" />
            New task
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-3">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelected(addDays(selected, -7))}
                aria-label="Previous week"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>

              <div className="text-center">
                <p className="text-sm font-semibold">
                  {formatDate(weekStart, {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  –{' '}
                  {formatDate(addDays(weekStart, 6), {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>

                {!days.includes(today) && (
                  <button
                    type="button"
                    onClick={() => setSelected(today)}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Back to this week
                  </button>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelected(addDays(selected, 7))}
                aria-label="Next week"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div
              role="tablist"
              aria-label="Day of week"
              className="grid grid-cols-7 gap-1"
            >
              {days.map((key) => {
                const dayTasks = getDayTasks(key)
                const isSelected = key === selected

                const allDone =
                  dayTasks.length > 0 &&
                  dayTasks.every((task) => task.status === 'completed')

                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelected(key)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      isSelected
                        ? 'bg-accent text-accent-fg'
                        : 'hover:bg-surface-2'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[11px] uppercase',
                        isSelected ? 'text-accent-fg/80' : 'text-muted'
                      )}
                    >
                      {formatDate(key, { weekday: 'short' })}
                    </span>

                    <span
                      className={cn(
                        'font-display text-lg font-semibold tabular-nums',
                        key === today && !isSelected && 'text-accent'
                      )}
                    >
                      {formatDate(key, { day: 'numeric' })}
                    </span>

                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        dayTasks.length === 0
                          ? 'bg-transparent'
                          : allDone
                            ? isSelected
                              ? 'bg-accent-fg'
                              : 'bg-accent'
                            : isSelected
                              ? 'bg-accent-fg/50'
                              : 'bg-muted'
                      )}
                      aria-hidden="true"
                    />

                    <span className="sr-only">
                      {dayTasks.length} tasks
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <section aria-labelledby="day-title">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 id="day-title" className="text-lg font-semibold">
                {relativeLabel(selected) ??
                  formatDate(selected, { weekday: 'long' })}

                <span className="ml-2 text-sm font-normal text-muted">
                  {formatDate(selected, {
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </h2>

              {tasks.length > 0 && (
                <span className="text-sm text-muted tabular-nums">
                  {formatDuration(doneMin)} / {formatDuration(totalMin)}
                </span>
              )}
            </div>

            {tasksError && (
              <p className="mb-3 text-sm text-red-500">{tasksError}</p>
            )}

            {tasksLoading ? (
              <p className="py-8 text-center text-sm text-muted">
                Loading tasks...
              </p>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No tasks for this day"
                description="Add a task with a subject, time and duration."
                action={
                  <Button
                    size="sm"
                    onClick={() => setModal({ task: null })}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add task
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {tasks.map((task) => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    onToggle={() => toggleTask(task._id)}
                    onEdit={() => setModal({ task })}
                    onDelete={() => setToDelete(task)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <WeeklyTarget anchorKey={selected} />
        </aside>
      </div>

      {modal && (
        <TaskFormModal
          key={modal.task?._id ?? 'new'}
          open
          onClose={() => setModal(null)}
          task={modal.task}
          defaultDate={selected}
        />
      )}

      <ConfirmModal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete this task?"
        description={
          toDelete
            ? `“${toDelete.title}” will be removed permanently.`
            : ''
        }
        confirmLabel="Delete"
      />
    </div>
  )
}
