import { DEFAULT_SCHEDULE, DEFAULT_WEEKLY_TARGET_HOURS, GOALS } from './constants'
import { addDays, todayKey } from './dates'
import { hashString, seededRandom, uid } from './utils'

export const createDefaultSchedule = () => DEFAULT_SCHEDULE.map((slot) => ({ ...slot, id: uid() }))

export function createFreshData(goal) {
  return {
    version: 1,
    goal,
    tasks: [],
    questionLogs: {},
    schedule: createDefaultSchedule(),
    weeklyTargetHours: DEFAULT_WEEKLY_TARGET_HOURS,
    activity: [],
    unlocked: {},
    createdAt: Date.now(),
  }
}

export function normalizeData(raw, goal) {
  const fresh = createFreshData(goal)
  if (!raw || typeof raw !== 'object') return fresh
  return {
    ...fresh,
    ...raw,
    goal,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    questionLogs: raw.questionLogs && typeof raw.questionLogs === 'object' ? raw.questionLogs : {},
    schedule: Array.isArray(raw.schedule) ? raw.schedule : fresh.schedule,
    activity: Array.isArray(raw.activity) ? raw.activity : [],
    unlocked: raw.unlocked && typeof raw.unlocked === 'object' ? raw.unlocked : {},
  }
}

export function pushActivity(data, entry) {
  const item = { id: uid(), ts: Date.now(), ...entry }
  const rest = entry.ref ? data.activity.filter((a) => a.ref !== entry.ref) : data.activity
  return { ...data, activity: [item, ...rest].slice(0, 50) }
}

// Seeded demo history for simulated friend profiles only. It is generated once,
// stored with the profile, and always labelled as demo activity in the UI.
export function generateDemoData(goal, seed) {
  const rand = seededRandom(hashString(seed))
  const data = { ...createFreshData(goal), demo: true }
  const { categories, subjects } = GOALS[goal]
  const today = todayKey()
  const durations = [60, 90, 120, 150, 180]
  const priorities = ['high', 'medium', 'low']

  for (let offset = 13; offset >= 0; offset--) {
    const key = addDays(today, -offset)
    if (offset > 0 && rand() < 0.15) continue

    const taskCount = 2 + Math.floor(rand() * 3)
    for (let i = 0; i < taskCount; i++) {
      const subject = subjects[Math.floor(rand() * (subjects.length - 1))]
      const completed = offset > 0 ? rand() < 0.85 : i === 0
      data.tasks.push({
        id: uid(),
        date: key,
        title: `${subject} session`,
        subject,
        time: `${String(8 + i * 3).padStart(2, '0')}:30`,
        durationMin: durations[Math.floor(rand() * durations.length)],
        priority: priorities[Math.floor(rand() * 3)],
        completed,
        completedAt: completed ? Date.now() - offset * 86400000 : null,
      })
    }

    const scale = offset === 0 ? 0.4 : 1
    data.questionLogs[key] = Object.fromEntries(
      categories.map((c) => [c.id, Math.round((c.dailyGoal * (0.4 + rand() * 0.9)) * scale)]),
    )
  }
  return data
}
