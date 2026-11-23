export const GOALS = {
  NEET: {
    id: 'NEET',
    label: 'NEET',
    tagline: 'Medical entrance preparation',
    description: 'Track Physics, Chemistry and Biology question practice.',
    unit: 'questions',
    categories: [
      { id: 'physics', label: 'Physics', color: 'bg-accent', text: 'text-accent', dailyGoal: 40 },
      { id: 'chemistry', label: 'Chemistry', color: 'bg-info', text: 'text-info', dailyGoal: 40 },
      { id: 'biology', label: 'Biology', color: 'bg-warn', text: 'text-warn', dailyGoal: 60 },
    ],
    subjects: ['Physics', 'Chemistry', 'Biology', 'Revision', 'Mock Test', 'Other'],
  },
  CSE: {
    id: 'CSE',
    label: 'CSE',
    tagline: 'Computer science & placements',
    description: 'Track LeetCode problems and Web Development practice.',
    unit: 'problems',
    categories: [
      { id: 'leetcode', label: 'LeetCode Problems', color: 'bg-accent', text: 'text-accent', dailyGoal: 5 },
      { id: 'webdev', label: 'Web Development', color: 'bg-info', text: 'text-info', dailyGoal: 3 },
    ],
    subjects: ['DSA', 'LeetCode', 'Web Development', 'System Design', 'Projects', 'Other'],
  },
}

export const PRIORITIES = [
  { id: 'high', label: 'High', className: 'bg-danger/10 text-danger border-danger/25' },
  { id: 'medium', label: 'Medium', className: 'bg-warn/10 text-warn border-warn/25' },
  { id: 'low', label: 'Low', className: 'bg-info/10 text-info border-info/25' },
]

export const SLOT_TYPES = [
  { id: 'study', label: 'Study', className: 'bg-accent', soft: 'bg-accent/10 text-accent border-accent/25' },
  { id: 'sleep', label: 'Sleep', className: 'bg-info', soft: 'bg-info/10 text-info border-info/25' },
  { id: 'meal', label: 'Meal', className: 'bg-warn', soft: 'bg-warn/10 text-warn border-warn/25' },
  { id: 'wellness', label: 'Wellness', className: 'bg-fg/60', soft: 'bg-fg/5 text-fg border-fg/15' },
  { id: 'break', label: 'Break', className: 'bg-muted', soft: 'bg-muted/10 text-muted border-muted/25' },
]

export const DEFAULT_SCHEDULE = [
  { name: 'Sleep', type: 'sleep', start: '02:00', end: '08:00' },
  { name: 'Fresh-up', type: 'wellness', start: '08:00', end: '08:30' },
  { name: 'Study 1', type: 'study', start: '08:30', end: '11:30' },
  { name: 'Bath', type: 'wellness', start: '11:30', end: '12:00' },
  { name: 'Study 2', type: 'study', start: '12:00', end: '13:30' },
  { name: 'Lunch', type: 'meal', start: '13:30', end: '14:00' },
  { name: 'Study 3', type: 'study', start: '14:00', end: '17:00' },
  { name: 'Yoga', type: 'wellness', start: '17:00', end: '17:30' },
  { name: 'Free time', type: 'break', start: '17:30', end: '18:00' },
  { name: 'Study 4', type: 'study', start: '18:00', end: '21:00' },
  { name: 'Break', type: 'break', start: '21:00', end: '21:15' },
  { name: 'Study 5', type: 'study', start: '21:15', end: '22:00' },
  { name: 'Dinner', type: 'meal', start: '22:00', end: '23:00' },
  { name: 'Study 6', type: 'study', start: '23:00', end: '02:00' },
]

export const DEFAULT_WEEKLY_TARGET_HOURS = 40

export const XP_RULES = { task: 10, question: 2 }

export const LEVEL_SIZE = 250
