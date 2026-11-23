import { GOALS, LEVEL_SIZE, XP_RULES } from './constants'
import { addDays, startOfWeek, todayKey, weekKeys } from './dates'

export const dayQuestions = (data, key) => data.questionLogs[key] ?? {}

export const questionsOn = (data, key) =>
  Object.values(dayQuestions(data, key)).reduce((sum, v) => sum + (Number(v) || 0), 0)

export const categoryOn = (data, key, categoryId) => Number(dayQuestions(data, key)[categoryId]) || 0

export const tasksOn = (data, key) => data.tasks.filter((t) => t.date === key)

export const completedTasks = (data) => data.tasks.filter((t) => t.completed)

export const studyMinutesOn = (data, key) =>
  tasksOn(data, key)
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (Number(t.durationMin) || 0), 0)

export const totalQuestions = (data, categoryId) =>
  Object.values(data.questionLogs).reduce((sum, day) => {
    if (categoryId) return sum + (Number(day[categoryId]) || 0)
    return sum + Object.values(day).reduce((s, v) => s + (Number(v) || 0), 0)
  }, 0)

export const isActiveDay = (data, key) =>
  questionsOn(data, key) > 0 || data.tasks.some((t) => t.completed && t.date === key)

export function currentStreak(data, today = todayKey()) {
  let key = isActiveDay(data, today) ? today : addDays(today, -1)
  let streak = 0
  while (isActiveDay(data, key) && streak < 3650) {
    streak++
    key = addDays(key, -1)
  }
  return streak
}

export function longestStreak(data) {
  const keys = new Set([
    ...Object.keys(data.questionLogs).filter((k) => questionsOn(data, k) > 0),
    ...data.tasks.filter((t) => t.completed).map((t) => t.date),
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

export function weekStats(data, anchorKey = todayKey()) {
  const categories = GOALS[data.goal]?.categories ?? []
  const days = weekKeys(anchorKey).map((key) => {
    const tasks = tasksOn(data, key)
    return {
      key,
      minutes: studyMinutesOn(data, key),
      questions: questionsOn(data, key),
      tasksTotal: tasks.length,
      tasksDone: tasks.filter((t) => t.completed).length,
      byCategory: Object.fromEntries(categories.map((c) => [c.id, categoryOn(data, key, c.id)])),
      active: isActiveDay(data, key),
    }
  })
  const sum = (field) => days.reduce((s, d) => s + d[field], 0)
  return {
    days,
    minutes: sum('minutes'),
    questions: sum('questions'),
    tasksTotal: sum('tasksTotal'),
    tasksDone: sum('tasksDone'),
    activeDays: days.filter((d) => d.active).length,
  }
}

const unlockedXP = (data, filter = () => true) =>
  Object.values(data.unlocked ?? {})
    .filter(filter)
    .reduce((sum, u) => sum + (u.xp || 0), 0)

export const totalXP = (data) =>
  completedTasks(data).length * XP_RULES.task + totalQuestions(data) * XP_RULES.question + unlockedXP(data)

export function weeklyXP(data, anchorKey = todayKey()) {
  const week = weekStats(data, anchorKey)
  const start = new Date(`${startOfWeek(anchorKey)}T00:00:00`).getTime()
  const end = start + 7 * 86400000
  return (
    week.tasksDone * XP_RULES.task +
    week.questions * XP_RULES.question +
    unlockedXP(data, (u) => u.ts >= start && u.ts < end)
  )
}

export function levelInfo(xp) {
  const level = Math.floor(xp / LEVEL_SIZE) + 1
  const into = xp % LEVEL_SIZE
  return { level, into, size: LEVEL_SIZE, progress: into / LEVEL_SIZE }
}

export const goalCompletion = (done, total) => (total ? Math.round((done / total) * 100) : 0)
