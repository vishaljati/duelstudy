import { XP_RULES } from './constants'
import { formatDate, startOfWeek, todayKey } from './dates'
import {
  completedTasks,
  currentStreak,
  longestStreak,
  questionsOn,
  studyMinutesOn,
  tasksOn,
  totalQuestions,
  weekStats,
} from './stats'

export const BADGES = [
  {
    id: 'first-task',
    title: 'First Step',
    description: 'Complete your first study task.',
    icon: 'CircleCheck',
    xp: 20,
    check: ({ data }) => completedTasks(data).length >= 1,
  },
  {
    id: 'tasks-25',
    title: 'Task Crusher',
    description: 'Complete 25 study tasks.',
    icon: 'ListChecks',
    xp: 60,
    check: ({ data }) => completedTasks(data).length >= 25,
  },
  {
    id: 'questions-100',
    title: 'Century',
    description: 'Log 100 questions or problems.',
    icon: 'Target',
    xp: 50,
    check: ({ data }) => totalQuestions(data) >= 100,
  },
  {
    id: 'questions-500',
    title: 'Problem Machine',
    description: 'Log 500 questions or problems.',
    icon: 'Zap',
    xp: 120,
    check: ({ data }) => totalQuestions(data) >= 500,
  },
  {
    id: 'streak-3',
    title: 'Warming Up',
    description: 'Reach a 3-day study streak.',
    icon: 'Flame',
    xp: 30,
    check: ({ data }) => longestStreak(data) >= 3,
  },
  {
    id: 'streak-7',
    title: 'On Fire',
    description: 'Reach a 7-day study streak.',
    icon: 'Flame',
    xp: 80,
    check: ({ data }) => longestStreak(data) >= 7,
  },
  {
    id: 'weekly-target',
    title: 'Target Locked',
    description: 'Hit your weekly study-hours target.',
    icon: 'Trophy',
    xp: 100,
    check: ({ data }) => weekStats(data).minutes >= data.weeklyTargetHours * 60,
  },
  {
    id: 'first-duel',
    title: 'Duelist',
    description: 'Connect with a study partner.',
    icon: 'Swords',
    xp: 40,
    check: ({ hasFriend }) => hasFriend,
  },
]

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]

export function dailyChallenges(data, key = todayKey()) {
  const questionGoal = data.goal === 'CSE' ? 6 : 50
  return [
    {
      id: 'tasks',
      title: 'Complete 3 tasks',
      progress: tasksOn(data, key).filter((t) => t.completed).length,
      goal: 3,
      xp: 25,
    },
    {
      id: 'questions',
      title: `Log ${questionGoal} ${data.goal === 'CSE' ? 'problems' : 'questions'}`,
      progress: questionsOn(data, key),
      goal: questionGoal,
      xp: 25,
    },
    {
      id: 'study',
      title: 'Study for 4 hours',
      progress: Math.round((studyMinutesOn(data, key) / 60) * 10) / 10,
      goal: 4,
      unit: 'h',
      xp: 30,
    },
  ].map((c) => ({ ...c, key: `daily:${c.id}:${key}`, done: c.progress >= c.goal }))
}

export function weeklyChallenges(data, key = todayKey()) {
  const week = weekStats(data, key)
  const questionGoal = data.goal === 'CSE' ? 35 : 300
  return [
    {
      id: 'hours',
      title: `Study ${data.weeklyTargetHours} hours this week`,
      progress: Math.round((week.minutes / 60) * 10) / 10,
      goal: data.weeklyTargetHours,
      unit: 'h',
      xp: 100,
    },
    {
      id: 'questions',
      title: `Log ${questionGoal} ${data.goal === 'CSE' ? 'problems' : 'questions'}`,
      progress: week.questions,
      goal: questionGoal,
      xp: 80,
    },
    {
      id: 'active',
      title: 'Be active on 5 days',
      progress: week.activeDays,
      goal: 5,
      xp: 60,
    },
  ].map((c) => ({ ...c, key: `weekly:${c.id}:${startOfWeek(key)}`, done: c.progress >= c.goal }))
}

// Returns rewards newly earned since the last evaluation, keyed so each one
// can only ever be granted once.
export function evaluateUnlocks(data, { hasFriend }) {
  const unlocked = data.unlocked ?? {}
  const fresh = {}
  const now = Date.now()

  for (const badge of BADGES) {
    const key = `badge:${badge.id}`
    if (!unlocked[key] && badge.check({ data, hasFriend })) {
      fresh[key] = { ts: now, xp: badge.xp, label: `Badge unlocked: ${badge.title}` }
    }
  }
  for (const c of [...dailyChallenges(data), ...weeklyChallenges(data)]) {
    if (c.done && !unlocked[c.key]) {
      fresh[c.key] = { ts: now, xp: c.xp, label: `Challenge complete: ${c.title}` }
    }
  }
  return fresh
}

export function rewardHistory(data, limit = 40) {
  const entries = []
  for (const task of completedTasks(data)) {
    entries.push({
      id: `task:${task.id}`,
      ts: task.completedAt ?? new Date(`${task.date}T12:00:00`).getTime(),
      label: `Completed “${task.title}”`,
      xp: XP_RULES.task,
    })
  }
  for (const [key, day] of Object.entries(data.questionLogs)) {
    const count = Object.values(day).reduce((s, v) => s + (Number(v) || 0), 0)
    if (count > 0) {
      entries.push({
        id: `q:${key}`,
        ts: new Date(`${key}T20:00:00`).getTime(),
        label: `Logged ${count} ${data.goal === 'CSE' ? 'problems' : 'questions'} on ${formatDate(key, { month: 'short', day: 'numeric' })}`,
        xp: count * XP_RULES.question,
      })
    }
  }
  for (const [key, u] of Object.entries(data.unlocked ?? {})) {
    entries.push({ id: key, ts: u.ts, label: u.label, xp: u.xp, special: true })
  }
  return entries.sort((a, b) => b.ts - a.ts).slice(0, limit)
}

export { currentStreak, longestStreak }
