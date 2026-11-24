
import { GOALS, LEVEL_SIZE, XP_RULES } from './constants'
import { addDays, startOfWeek, todayKey, weekKeys } from './dates'

// --------------------------------------------------
// Questions
// --------------------------------------------------

export const dayQuestions = (data, key) =>
  data.questionLogs[key] ?? {}

export const questionsOn = (data, key) =>
  Object.values(dayQuestions(data, key)).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  )

export const categoryOn = (data, key, categoryId) =>
  Number(dayQuestions(data, key)[categoryId]) || 0

export const totalQuestions = (data, categoryId) =>
  Object.values(data.questionLogs).reduce((sum, day) => {
    if (categoryId) {
      return sum + (Number(day[categoryId]) || 0)
    }

    return (
      sum +
      Object.values(day).reduce(
        (total, value) => total + (Number(value) || 0),
        0,
      )
    )
  }, 0)

// --------------------------------------------------
// Tasks (MongoDB API data)
// --------------------------------------------------

export const tasksOn = (data, key) =>
  data.tasks.filter(
    (task) => String(task.scheduledDate).slice(0, 10) === key,
  )

export const completedTasks = (data) =>
  data.tasks.filter(
    (task) => task.status === 'completed',
  )

export const studyMinutesOn = (data, key) =>
  tasksOn(data, key)
    .filter((task) => task.status === 'completed')
    .reduce(
      (sum, task) =>
        sum + (Number(task.durationMinutes) || 0),
      0,
    )

// --------------------------------------------------
// Activity and streaks
// --------------------------------------------------

export const isActiveDay = (data, key) =>
  questionsOn(data, key) > 0 ||
  data.tasks.some(
    (task) =>
      task.status === 'completed' &&
      String(task.scheduledDate).slice(0, 10) === key,
  )

export function currentStreak(data, today = todayKey()) {
  let key = isActiveDay(data, today)
    ? today
    : addDays(today, -1)

  let streak = 0

  while (isActiveDay(data, key) && streak < 3650) {
    streak++
    key = addDays(key, -1)
  }

  return streak
}

export function longestStreak(data) {
  const keys = new Set([
    ...Object.keys(data.questionLogs).filter(
      (key) => questionsOn(data, key) > 0,
    ),

    ...data.tasks
      .filter((task) => task.status === 'completed')
      .map((task) =>
        String(task.scheduledDate).slice(0, 10),
      ),
  ])

  let best = 0

  for (const key of keys) {
    if (keys.has(addDays(key, -1))) continue

    let length = 1
    let next = addDays(key, 1)

    while (keys.has(next)) {
      length++
      next = addDays(next, 1)
    }

    best = Math.max(best, length)
  }

  return best
}

// --------------------------------------------------
// Weekly statistics
// --------------------------------------------------

export function weekStats(data, anchorKey = todayKey()) {
  const categories = GOALS[data.goal]?.categories ?? []

  const days = weekKeys(anchorKey).map((key) => {
    const tasks = tasksOn(data, key)

    return {
      key,

      minutes: studyMinutesOn(data, key),

      questions: questionsOn(data, key),

      tasksTotal: tasks.length,

      tasksDone: tasks.filter(
        (task) => task.status === 'completed',
      ).length,

      byCategory: Object.fromEntries(
        categories.map((category) => [
          category.id,
          categoryOn(data, key, category.id),
        ]),
      ),

      active: isActiveDay(data, key),
    }
  })

  const sum = (field) =>
    days.reduce((total, day) => total + day[field], 0)

  return {
    days,
    minutes: sum('minutes'),
    questions: sum('questions'),
    tasksTotal: sum('tasksTotal'),
    tasksDone: sum('tasksDone'),
    activeDays: days.filter((day) => day.active).length,
  }
}

// --------------------------------------------------
// XP calculations
// --------------------------------------------------

const unlockedXP = (data, filter = () => true) =>
  Object.values(data.unlocked ?? {})
    .filter(filter)
    .reduce(
      (sum, unlock) => sum + (unlock.xp || 0),
      0,
    )

export const totalXP = (data) =>
  completedTasks(data).length * XP_RULES.task +
  totalQuestions(data) * XP_RULES.question +
  unlockedXP(data)

export function weeklyXP(data, anchorKey = todayKey()) {
  const week = weekStats(data, anchorKey)

  const start = new Date(
    `${startOfWeek(anchorKey)}T00:00:00`,
  ).getTime()

  const end = start + 7 * 86400000

  return (
    week.tasksDone * XP_RULES.task +
    week.questions * XP_RULES.question +
    unlockedXP(
      data,
      (unlock) => unlock.ts >= start && unlock.ts < end,
    )
  )
}

// --------------------------------------------------
// Levels and goal completion
// --------------------------------------------------

export function levelInfo(xp) {
  const level = Math.floor(xp / LEVEL_SIZE) + 1
  const into = xp % LEVEL_SIZE

  return {
    level,
    into,
    size: LEVEL_SIZE,
    progress: into / LEVEL_SIZE,
  }
}

export const goalCompletion = (done, total) =>
  total
    ? Math.round((done / total) * 100)
    : 0
