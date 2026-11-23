import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { GOALS } from '../lib/constants'
import { formatDate } from '../lib/dates'
import { evaluateUnlocks } from '../lib/rewards'
import { storage } from '../lib/storage'
import { createDefaultSchedule, generateDemoData, normalizeData, pushActivity } from '../lib/userData'
import { clampInt, generateInviteCode, uid } from '../lib/utils'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

const CODE_RE = /^DUEL-[A-Z0-9]{6}$/

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(() => normalizeData(storage.getUserData(user.id), user.goal))
  const [users, setUsers] = useState(() => storage.getUsers())
  const [invites, setInvites] = useState(() => storage.getInvites())

  const update = useCallback(
    (fn) =>
      setData((prev) => {
        const next = fn(prev)
        storage.saveUserData(user.id, next)
        return next
      }),
    [user.id],
  )

  const saveInvites = useCallback((next) => {
    storage.saveInvites(next)
    setInvites(next)
  }, [])

  // Keep invitations in sync when another tab (another local account) changes them.
  useEffect(() => {
    const onStorage = (event) => {
      if (!storage.isAppKey(event.key)) return
      setInvites(storage.getInvites())
      setUsers(storage.getUsers())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const userById = useCallback((id) => users.find((u) => u.id === id) ?? null, [users])

  const myInvites = useMemo(
    () => invites.filter((i) => (i.fromId === user.id || i.toId === user.id) && i.status !== 'removed'),
    [invites, user.id],
  )
  const friendship = myInvites.find((i) => i.status === 'accepted') ?? null
  const friendId = friendship ? (friendship.fromId === user.id ? friendship.toId : friendship.fromId) : null
  const friend = friendId ? userById(friendId) : null
  const friendData = useMemo(
    () => (friend ? normalizeData(storage.getUserData(friend.id), friend.goal) : null),
    // invites change when the friendship changes; re-read the friend's latest data then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [friend, invites],
  )

  useEffect(() => {
    const fresh = evaluateUnlocks(data, { hasFriend: Boolean(friend) })
    const keys = Object.keys(fresh)
    if (!keys.length) return
    update((d) => {
      let next = { ...d, unlocked: { ...d.unlocked, ...fresh } }
      for (const key of keys) next = pushActivity(next, { type: 'reward', text: `${fresh[key].label} (+${fresh[key].xp} XP)` })
      return next
    })
  }, [data, friend, update])

  // Tasks
  const addTask = useCallback(
    (task) =>
      update((d) =>
        pushActivity(
          { ...d, tasks: [...d.tasks, { ...task, id: uid(), completed: false, completedAt: null, createdAt: Date.now() }] },
          { type: 'task', text: `Planned “${task.title}” for ${formatDate(task.date, { weekday: 'short', month: 'short', day: 'numeric' })}` },
        ),
      ),
    [update],
  )

  const updateTask = useCallback(
    (id, changes) => update((d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)) })),
    [update],
  )

  const deleteTask = useCallback(
    (id) =>
      update((d) => {
        const task = d.tasks.find((t) => t.id === id)
        const next = { ...d, tasks: d.tasks.filter((t) => t.id !== id) }
        return task ? pushActivity(next, { type: 'delete', text: `Removed “${task.title}”` }) : next
      }),
    [update],
  )

  const toggleTask = useCallback(
    (id) =>
      update((d) => {
        const task = d.tasks.find((t) => t.id === id)
        if (!task) return d
        const completed = !task.completed
        const next = {
          ...d,
          tasks: d.tasks.map((t) => (t.id === id ? { ...t, completed, completedAt: completed ? Date.now() : null } : t)),
        }
        return completed
          ? pushActivity(next, { type: 'complete', text: `Completed “${task.title}”`, ref: `task:${id}` })
          : { ...next, activity: next.activity.filter((a) => a.ref !== `task:${id}`) }
      }),
    [update],
  )

  // Questions
  const setQuestionCount = useCallback(
    (dateKey, categoryId, value) =>
      update((d) => {
        const count = clampInt(value, 0, 9999)
        const day = { ...(d.questionLogs[dateKey] ?? {}), [categoryId]: count }
        const label = GOALS[d.goal].categories.find((c) => c.id === categoryId)?.label ?? categoryId
        const next = { ...d, questionLogs: { ...d.questionLogs, [dateKey]: day } }
        const ref = `q:${dateKey}:${categoryId}`
        if (count === 0) return { ...next, activity: next.activity.filter((a) => a.ref !== ref) }
        return pushActivity(next, {
          type: 'questions',
          ref,
          text: `Logged ${count} ${label} ${GOALS[d.goal].unit} for ${formatDate(dateKey, { month: 'short', day: 'numeric' })}`,
        })
      }),
    [update],
  )

  // Timetable
  const saveSlot = useCallback(
    (slot) =>
      update((d) => ({
        ...d,
        schedule: slot.id
          ? d.schedule.map((s) => (s.id === slot.id ? { ...s, ...slot } : s))
          : [...d.schedule, { ...slot, id: uid() }],
      })),
    [update],
  )
  const deleteSlot = useCallback((id) => update((d) => ({ ...d, schedule: d.schedule.filter((s) => s.id !== id) })), [update])
  const resetSchedule = useCallback(() => update((d) => ({ ...d, schedule: createDefaultSchedule() })), [update])

  const setWeeklyTarget = useCallback(
    (hours) => update((d) => ({ ...d, weeklyTargetHours: clampInt(hours, 1, 168) })),
    [update],
  )

  // Friends (local simulation)
  const sendInvite = useCallback(
    (rawCode) => {
      const code = rawCode.trim().toUpperCase()
      if (!CODE_RE.test(code)) return { ok: false, error: 'Codes look like DUEL-AB12CD.' }
      if (code === user.inviteCode) return { ok: false, error: 'That is your own code. Share it with a friend instead.' }
      if (friendship) return { ok: false, error: 'You already have a study partner. Remove them first.' }

      const allUsers = storage.getUsers()
      const target = allUsers.find((u) => u.inviteCode === code)
      if (!target) return { ok: false, error: 'No profile in this browser uses that code.' }

      const allInvites = storage.getInvites()
      const live = allInvites.filter((i) => i.status === 'pending' || i.status === 'accepted')
      if (live.some((i) => (i.fromId === user.id && i.toId === target.id) || (i.fromId === target.id && i.toId === user.id))) {
        return { ok: false, error: `There is already a pending invitation with ${target.name}.` }
      }
      if (live.some((i) => i.status === 'accepted' && (i.fromId === target.id || i.toId === target.id))) {
        return { ok: false, error: `${target.name} already has a study partner.` }
      }

      setUsers(allUsers)
      saveInvites([...allInvites, { id: uid(), fromId: user.id, toId: target.id, status: 'pending', createdAt: Date.now() }])
      update((d) => pushActivity(d, { type: 'friend', text: `Sent a duel invitation to ${target.name}` }))
      return { ok: true, name: target.name }
    },
    [friendship, saveInvites, update, user.id, user.inviteCode],
  )

  const respondInvite = useCallback(
    (id, status) => {
      const all = storage.getInvites()
      const invite = all.find((i) => i.id === id)
      if (!invite) return
      const otherId = invite.fromId === user.id ? invite.toId : invite.fromId
      const next = all.map((i) => {
        if (i.id === id) return { ...i, status, respondedAt: Date.now() }
        const involvesPair = [i.fromId, i.toId].some((p) => p === user.id || p === otherId)
        if (status === 'accepted' && i.status === 'pending' && involvesPair) return { ...i, status: 'declined' }
        return i
      })
      saveInvites(next)
      if (status === 'accepted') {
        const other = userById(otherId)
        update((d) => pushActivity(d, { type: 'friend', text: `You and ${other?.name ?? 'your friend'} are now study partners` }))
      }
    },
    [saveInvites, update, user.id, userById],
  )

  const removeFriend = useCallback(() => {
    if (!friendship) return
    saveInvites(storage.getInvites().map((i) => (i.id === friendship.id ? { ...i, status: 'removed' } : i)))
  }, [friendship, saveInvites])

  const createSimulatedProfile = useCallback(
    ({ name, goal }) => {
      const trimmed = name.trim()
      if (trimmed.length < 2) return { ok: false, error: 'Give the profile a name (at least 2 characters).' }
      if (!GOALS[goal]) return { ok: false, error: 'Choose a goal for the profile.' }
      const allUsers = storage.getUsers()
      const profile = {
        id: uid(),
        name: trimmed,
        email: null,
        goal,
        simulated: true,
        createdBy: user.id,
        inviteCode: generateInviteCode(allUsers.map((u) => u.inviteCode)),
        createdAt: Date.now(),
      }
      const nextUsers = [...allUsers, profile]
      storage.saveUsers(nextUsers)
      storage.saveUserData(profile.id, generateDemoData(goal, profile.id))
      setUsers(nextUsers)
      return { ok: true, profile }
    },
    [user.id],
  )

  const deleteSimulatedProfile = useCallback(
    (id) => {
      const allUsers = storage.getUsers().filter((u) => !(u.id === id && u.simulated && u.createdBy === user.id))
      storage.saveUsers(allUsers)
      setUsers(allUsers)
      saveInvites(storage.getInvites().filter((i) => i.fromId !== id && i.toId !== id))
    },
    [saveInvites, user.id],
  )

  const simulatedProfiles = useMemo(
    () => users.filter((u) => u.simulated && u.createdBy === user.id),
    [users, user.id],
  )

  const value = {
    user,
    data,
    goal: GOALS[user.goal],
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    setQuestionCount,
    saveSlot,
    deleteSlot,
    resetSchedule,
    setWeeklyTarget,
    invites: myInvites,
    userById,
    friend,
    friendData,
    sendInvite,
    respondInvite,
    removeFriend,
    createSimulatedProfile,
    deleteSimulatedProfile,
    simulatedProfiles,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
