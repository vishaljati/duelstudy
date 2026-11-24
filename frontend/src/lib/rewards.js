
import { XP_RULES } from './constants'

import {
  formatDate,
  startOfWeek,
  todayKey,
} from './dates'

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

// --------------------------------------------------
// Streak ranks
// --------------------------------------------------

export const STREAK_RANKS = [
  { id: 'knight', title: 'Knight', days: 3, xp: 25, icon: 'Sword' },
  { id: 'warrior', title: 'Warrior', days: 7, xp: 50, icon: 'Shield' },
  { id: 'elite-knight', title: 'Elite Knight', days: 14, xp: 100, icon: 'Crown' },
  { id: 'legend', title: 'Legend', days: 30, xp: 200, icon: 'Trophy' },
  { id: 'mythic', title: 'Mythic', days: 60, xp: 350, icon: 'Zap' },
  { id: 'immortal', title: 'Immortal', days: 100, xp: 500, icon: 'Flame' },
]

export const STREAK_MILESTONES = STREAK_RANKS.map((rank) => rank.days)

// --------------------------------------------------
// Historical weekly statistics
// --------------------------------------------------

function getHistoricalWeeks(data) {
  const dateKeys = [
    ...Object.keys(data.questionLogs ?? {}),
    ...(data.tasks ?? []).map((task) =>
      String(task.scheduledDate).slice(0, 10)
    ),
    todayKey(),
  ]

  const weekStarts = [
    ...new Set(dateKeys.map((key) => startOfWeek(key))),
  ]

  return weekStarts.map((key) => ({
    key,
    ...weekStats(data, key),
  }))
}

function getBestWeek(data) {
  const weeks = getHistoricalWeeks(data)

  return weeks.reduce(
    (best, week) => ({
      tasksDone: Math.max(best.tasksDone, week.tasksDone),
      minutes: Math.max(best.minutes, week.minutes),
      questions: Math.max(best.questions, week.questions),
      activeDays: Math.max(best.activeDays, week.activeDays),
      perfectWeek:
        best.perfectWeek ||
        (week.tasksTotal > 0 && week.tasksDone === week.tasksTotal),
    }),
    {
      tasksDone: 0,
      minutes: 0,
      questions: 0,
      activeDays: 0,
      perfectWeek: false,
    }
  )
}

// --------------------------------------------------
// Badge definitions
// --------------------------------------------------

const commonBadges = [
  {
    id: 'first-task',
    title: 'First Step',
    description: 'Complete your first study task.',
    icon: 'CircleCheck',
    xp: 20,
    goal: 1,
    unit: 'tasks',
    progress: ({ data }) => completedTasks(data).length,
    check: ({ data }) => completedTasks(data).length >= 1,
  },
]

const neetBadges = [
  {
    id: 'weekly-warrior',
    title: 'Weekly Warrior',
    description: 'Complete 15 tasks in a single week.',
    icon: 'ListChecks',
    xp: 100,
    goal: 15,
    unit: 'tasks',
    progress: ({ data }) => getBestWeek(data).tasksDone,
    check: ({ data }) => getBestWeek(data).tasksDone >= 15,
  },
  {
    id: 'study-machine',
    title: 'Study Machine',
    description: 'Complete 20 study hours in a single week.',
    icon: 'Zap',
    xp: 150,
    goal: 20,
    unit: 'hours',
    progress: ({ data }) => getBestWeek(data).minutes / 60,
    check: ({ data }) => getBestWeek(data).minutes >= 1200,
  },
  {
    id: 'question-slayer',
    title: 'Question Slayer',
    description: 'Solve 500 questions.',
    icon: 'Target',
    xp: 100,
    goal: 500,
    unit: 'questions',
    progress: ({ data }) => totalQuestions(data),
    check: ({ data }) => totalQuestions(data) >= 500,
  },
  {
    id: 'question-master',
    title: 'Question Master',
    description: 'Solve 2,000 questions.',
    icon: 'Trophy',
    xp: 250,
    goal: 2000,
    unit: 'questions',
    progress: ({ data }) => totalQuestions(data),
    check: ({ data }) => totalQuestions(data) >= 2000,
  },
  {
    id: 'perfect-week',
    title: 'Perfect Week',
    description: 'Complete every scheduled task in a week.',
    icon: 'Crown',
    xp: 200,
    goal: 1,
    unit: 'week',
    progress: ({ data }) => getBestWeek(data).perfectWeek ? 1 : 0,
    check: ({ data }) => getBestWeek(data).perfectWeek,
  },
  {
    id: 'biology-specialist',
    title: 'Biology Specialist',
    description: 'Solve 500 Biology questions.',
    icon: 'Flame',
    xp: 150,
    goal: 500,
    unit: 'questions',
    progress: ({ data }) => totalQuestions(data, 'biology'),
    check: ({ data }) => totalQuestions(data, 'biology') >= 500,
  },
  {
    id: 'science-champion',
    title: 'Science Champion',
    description: 'Solve 5,000 questions across all subjects.',
    icon: 'Trophy',
    xp: 400,
    goal: 5000,
    unit: 'questions',
    progress: ({ data }) => totalQuestions(data),
    check: ({ data }) => totalQuestions(data) >= 5000,
  },
]

const cseBadges = [
  {
    id: 'leetcode-100',
    title: 'LeetCode Rookie',
    description: 'Solve 100 LeetCode problems.',
    icon: 'Target',
    xp: 100,
    goal: 100,
    unit: 'problems',
    progress: ({ data }) => totalQuestions(data, 'leetcode'),
    check: ({ data }) => totalQuestions(data, 'leetcode') >= 100,
  },
  {
    id: 'leetcode-150',
    title: 'LeetCode Grinder',
    description: 'Solve 150 LeetCode problems.',
    icon: 'Zap',
    xp: 150,
    goal: 150,
    unit: 'problems',
    progress: ({ data }) => totalQuestions(data, 'leetcode'),
    check: ({ data }) => totalQuestions(data, 'leetcode') >= 150,
  },
  {
    id: 'leetcode-500',
    title: 'Problem Solver',
    description: 'Solve 500 LeetCode problems.',
    icon: 'Sword',
    xp: 250,
    goal: 500,
    unit: 'problems',
    progress: ({ data }) => totalQuestions(data, 'leetcode'),
    check: ({ data }) => totalQuestions(data, 'leetcode') >= 500,
  },
  {
    id: 'leetcode-1000',
    title: 'Problem Master',
    description: 'Solve 1,000 LeetCode problems.',
    icon: 'Crown',
    xp: 500,
    goal: 1000,
    unit: 'problems',
    progress: ({ data }) => totalQuestions(data, 'leetcode'),
    check: ({ data }) => totalQuestions(data, 'leetcode') >= 1000,
  },
]

export const BADGES = [
  ...commonBadges,
  ...(dataGoalIsCSE() ? cseBadges : neetBadges),
]

function dataGoalIsCSE() {
  return false
}

// --------------------------------------------------
// Goal-specific badge selection
// --------------------------------------------------

export function getBadges(goal) {
  return [
    ...commonBadges,
    ...(goal === 'CSE' ? cseBadges : neetBadges),
  ]
}

// --------------------------------------------------
// Daily challenges
// --------------------------------------------------

export function dailyChallenges(data, key = todayKey()) {
  const questionGoal = data.goal === 'CSE' ? 6 : 50

  return [
    {
      id: 'tasks',
      title: 'Complete 3 tasks',
      progress: tasksOn(data, key).filter(
        (task) => task.status === 'completed'
      ).length,
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
  ].map((challenge) => ({
    ...challenge,
    key: `daily:${challenge.id}:${key}`,
    done: challenge.progress >= challenge.goal,
  }))
}

// --------------------------------------------------
// Weekly challenges
// --------------------------------------------------

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
  ].map((challenge) => ({
    ...challenge,
    key: `weekly:${challenge.id}:${startOfWeek(key)}`,
    done: challenge.progress >= challenge.goal,
  }))
}

// --------------------------------------------------
// Unlock evaluation
// --------------------------------------------------

export function evaluateUnlocks(data, { hasFriend } = {}) {
  const unlocked = data.unlocked ?? {}
  const fresh = {}
  const now = Date.now()

  const badges = getBadges(data.goal)

  for (const badge of badges) {
    const key = `badge:${badge.id}`

    if (
      !unlocked[key] &&
      badge.check({ data, hasFriend })
    ) {
      fresh[key] = {
        ts: now,
        xp: badge.xp,
        label: `Badge unlocked: ${badge.title}`,
      }
    }
  }

  // Streak ranks are permanent achievements.
  const bestStreak = longestStreak(data)

  for (const rank of STREAK_RANKS) {
    const key = `rank:${rank.id}`

    if (!unlocked[key] && bestStreak >= rank.days) {
      fresh[key] = {
        ts: now,
        xp: rank.xp,
        label: `Rank unlocked: ${rank.title}`,
      }
    }
  }

  // Daily and current-week challenges.
  const challenges = [
    ...dailyChallenges(data),
    ...weeklyChallenges(data),
  ]

  for (const challenge of challenges) {
    if (challenge.done && !unlocked[challenge.key]) {
      fresh[challenge.key] = {
        ts: now,
        xp: challenge.xp,
        label: `Challenge complete: ${challenge.title}`,
      }
    }
  }

  return fresh
}

// --------------------------------------------------
// Reward history
// --------------------------------------------------

export function rewardHistory(data, limit = 40) {
  const entries = []

  for (const task of completedTasks(data)) {
    entries.push({
      id: `task:${task._id}`,
      ts: new Date(
        task.completedAt ??
        `${String(task.scheduledDate).slice(0, 10)}T12:00:00`
      ).getTime(),
      label: `Completed "${task.title}"`,
      xp: XP_RULES.task,
    })
  }

  for (const [key, day] of Object.entries(data.questionLogs ?? {})) {
    const count = Object.values(day).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0
    )

    if (count > 0) {
      entries.push({
        id: `questions:${key}`,
        ts: new Date(`${key}T20:00:00`).getTime(),
        label: `Logged ${count} ${data.goal === 'CSE' ? 'problems' : 'questions'} on ${formatDate(key, {
          month: 'short',
          day: 'numeric',
        })}`,
        xp: count * XP_RULES.question,
      })
    }
  }

  for (const [key, unlock] of Object.entries(data.unlocked ?? {})) {
    entries.push({
      id: key,
      ts: Number(unlock.ts) || 0,
      label: unlock.label,
      xp: Number(unlock.xp) || 0,
      special: true,
    })
  }

  return entries
    .filter((entry) => entry.ts > 0)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
}

export { currentStreak, longestStreak }
