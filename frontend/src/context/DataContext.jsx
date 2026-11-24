
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { GOALS } from '../lib/constants'
import { formatDate, startOfWeek, todayKey } from '../lib/dates'
import { evaluateUnlocks } from '../lib/rewards'
import { storage } from '../lib/storage'
import {
  createDefaultSchedule,
  generateDemoData,
  normalizeData,
  pushActivity,
} from '../lib/userData'
import { clampInt, generateInviteCode, uid } from '../lib/utils'
import { useAuth } from './AuthContext'
import plannerService from '../services/planner.service'

const DataContext = createContext(null)

const CODE_RE = /^DUEL-[A-Z0-9]{6}$/

export function DataProvider({ children }) {
  const { user } = useAuth()

  const userId = user?.id

  // --------------------------------------------------
  // Main application data
  // --------------------------------------------------

  const [data, setData] = useState(() => ({
    ...normalizeData(storage.getUserData(userId), user?.goal),
    tasks: [],
    weeklyProgress: null,
  }))

  const [users, setUsers] = useState(() => storage.getUsers())
  const [invites, setInvites] = useState(() => storage.getInvites())

  // Planner loading and error states
  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState('')

  // Keep track of the selected week without changing callback identity.
  const activeWeekStart = useRef(startOfWeek(todayKey()))

  // --------------------------------------------------
  // Reset local data when the authenticated user changes
  // --------------------------------------------------

  useEffect(() => {
    if (!userId) {
      setData({
        ...normalizeData(null),
        tasks: [],
        weeklyProgress: null,
      })

      setTasksError('')
      setTasksLoading(false)
      return
    }

    const freshData = normalizeData(
      storage.getUserData(userId),
      user?.goal,
    )

    setData({
      ...freshData,
      tasks: [],
      weeklyProgress: null,
    })

    setTasksError('')
    activeWeekStart.current = startOfWeek(todayKey())
  }, [userId, user?.goal])

  // --------------------------------------------------
  // Local data update
  // --------------------------------------------------

  const update = useCallback(
    (fn) => {
      setData((prev) => {
        const next = fn(prev)

        if (!userId) return next

        // Tasks, weekly progress and weekly target are API-owned.
        // Never save them as localStorage source data.
        const {
          tasks,
          weeklyProgress,
          weeklyTargetHours,
          ...localData
        } = next

        storage.saveUserData(userId, {
          ...localData,
          tasks: [],
        })

        return next
      })
    },
    [userId],
  )

  // --------------------------------------------------
  // Planner API
  // --------------------------------------------------

  const refreshWeeklyProgress = useCallback(async (weekStart) => {
    const selectedWeek = weekStart || activeWeekStart.current

    const weeklyProgress =
      await plannerService.getWeeklyProgress(selectedWeek)

    setData((prev) => ({
      ...prev,
      weeklyProgress,
      weeklyTargetHours: weeklyProgress.weeklyTargetHours,
    }))

    return weeklyProgress
  }, [])

  const refreshPlannerData = useCallback(async (weekStart) => {
    if (!userId) return

    const selectedWeek = weekStart || activeWeekStart.current

    activeWeekStart.current = selectedWeek

    setTasksLoading(true)
    setTasksError('')

    try {
      // Fetch all tasks so other dashboard components can
      // continue using historical task data as well.
      const [tasks, weeklyProgress] = await Promise.all([
        plannerService.getTasks(),
        plannerService.getWeeklyProgress(selectedWeek),
      ])

      setData((prev) => ({
        ...prev,
        tasks,
        weeklyProgress,
        weeklyTargetHours: weeklyProgress.weeklyTargetHours,
      }))

      return { tasks, weeklyProgress }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Unable to load planner data.'

      setTasksError(message)
      throw error
    } finally {
      setTasksLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    refreshPlannerData()
  }, [userId, refreshPlannerData])

  // --------------------------------------------------
  // Tasks CRUD
  // --------------------------------------------------

  const addTask = useCallback(
    async (taskData) => {
      const task = await plannerService.createTask(taskData)

      update((prev) =>
        pushActivity(
          {
            ...prev,
            tasks: [...prev.tasks, task],
          },
          {
            type: 'task',
            text: `Planned “${task.title}” for ${formatDate(
              task.scheduledDate,
              {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              },
            )}`,
          },
        ),
      )

      // Refresh weekly planned/completed minutes.
      await refreshWeeklyProgress()

      return task
    },
    [update, refreshWeeklyProgress],
  )

  const updateTask = useCallback(
    async (taskId, changes) => {
      const updatedTask = await plannerService.updateTask(
        taskId,
        changes,
      )

      update((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task._id === taskId ? updatedTask : task,
        ),
      }))

      await refreshWeeklyProgress()

      return updatedTask
    },
    [update, refreshWeeklyProgress],
  )

  const deleteTask = useCallback(
    async (taskId) => {
      const task = data.tasks.find(
        (item) => item._id === taskId,
      )

      await plannerService.deleteTask(taskId)

      update((prev) => {
        const next = {
          ...prev,
          tasks: prev.tasks.filter(
            (item) => item._id !== taskId,
          ),
        }

        return task
          ? pushActivity(next, {
            type: 'delete',
            text: `Removed “${task.title}”`,
          })
          : next
      })

      await refreshWeeklyProgress()

      return true
    },
    [data.tasks, update, refreshWeeklyProgress],
  )

  const toggleTask = useCallback(
    async (taskId) => {
      const task = data.tasks.find(
        (item) => item._id === taskId,
      )

      if (!task) return null

      const newStatus =
        task.status === 'completed' ? 'planned' : 'completed'

      const updatedTask =
        await plannerService.updateTaskStatus(
          taskId,
          newStatus,
        )

      update((prev) => {
        const next = {
          ...prev,
          tasks: prev.tasks.map((item) =>
            item._id === taskId ? updatedTask : item,
          ),
        }

        const activityRef = `task:${taskId}`

        if (newStatus === 'completed') {
          return pushActivity(next, {
            type: 'complete',
            text: `Completed “${task.title}”`,
            ref: activityRef,
          })
        }

        return {
          ...next,
          activity: next.activity.filter(
            (activity) => activity.ref !== activityRef,
          ),
        }
      })

      await refreshWeeklyProgress()

      return updatedTask
    },
    [data.tasks, update, refreshWeeklyProgress],
  )

  // --------------------------------------------------
  // Questions
  // --------------------------------------------------

  const setQuestionCount = useCallback(
    (dateKey, categoryId, value) =>
      update((d) => {
        const count = clampInt(value, 0, 9999)

        const day = {
          ...(d.questionLogs[dateKey] ?? {}),
          [categoryId]: count,
        }

        const label =
          GOALS[d.goal].categories.find(
            (category) => category.id === categoryId,
          )?.label ?? categoryId

        const next = {
          ...d,
          questionLogs: {
            ...d.questionLogs,
            [dateKey]: day,
          },
        }

        const ref = `q:${dateKey}:${categoryId}`

        if (count === 0) {
          return {
            ...next,
            activity: next.activity.filter(
              (activity) => activity.ref !== ref,
            ),
          }
        }

        return pushActivity(next, {
          type: 'questions',
          ref,
          text: `Logged ${count} ${label} ${GOALS[d.goal].unit
            } for ${formatDate(dateKey, {
              month: 'short',
              day: 'numeric',
            })}`,
        })
      }),
    [update],
  )

  // --------------------------------------------------
  // Timetable
  // --------------------------------------------------

  const saveSlot = useCallback(
    (slot) =>
      update((d) => ({
        ...d,
        schedule: slot.id
          ? d.schedule.map((item) =>
            item.id === slot.id
              ? { ...item, ...slot }
              : item,
          )
          : [...d.schedule, { ...slot, id: uid() }],
      })),
    [update],
  )

  const deleteSlot = useCallback(
    (id) =>
      update((d) => ({
        ...d,
        schedule: d.schedule.filter(
          (slot) => slot.id !== id,
        ),
      })),
    [update],
  )

  const resetSchedule = useCallback(
    () =>
      update((d) => ({
        ...d,
        schedule: createDefaultSchedule(),
      })),
    [update],
  )

  // --------------------------------------------------
  // Weekly target
  // --------------------------------------------------

  const setWeeklyTarget = useCallback(
    async (hours) => {
      const weeklyTargetHours = clampInt(hours, 1, 168)

      await plannerService.updateWeeklyTarget(
        weeklyTargetHours,
      )

      const weeklyProgress = await refreshWeeklyProgress()

      return weeklyProgress
    },
    [refreshWeeklyProgress],
  )

  // --------------------------------------------------
  // Friends (local simulation)
  // --------------------------------------------------

  const saveInvites = useCallback((next) => {
    storage.saveInvites(next)
    setInvites(next)
  }, [])

  // Keep invitations in sync when another tab changes them.
  useEffect(() => {
    const onStorage = (event) => {
      if (!storage.isAppKey(event.key)) return

      setInvites(storage.getInvites())
      setUsers(storage.getUsers())
    }

    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const userById = useCallback(
    (id) => users.find((item) => item.id === id) ?? null,
    [users],
  )

  const myInvites = useMemo(
    () =>
      !userId
        ? []
        : invites.filter(
          (invite) =>
            (invite.fromId === userId ||
              invite.toId === userId) &&
            invite.status !== 'removed',
        ),
    [invites, userId],
  )

  const friendship = myInvites.find(
    (invite) => invite.status === 'accepted',
  ) ?? null

  const friendId = friendship
    ? friendship.fromId === userId
      ? friendship.toId
      : friendship.fromId
    : null

  const friend = friendId ? userById(friendId) : null

  const friendData = useMemo(
    () =>
      friend
        ? normalizeData(
          storage.getUserData(friend.id),
          friend.goal,
        )
        : null,
    [friend, invites],
  )

  const sendInvite = useCallback(
    (rawCode) => {
      if (!user) {
        return { ok: false, error: 'You must be logged in.' }
      }

      const code = rawCode.trim().toUpperCase()

      if (!CODE_RE.test(code)) {
        return {
          ok: false,
          error: 'Codes look like DUEL-AB12CD.',
        }
      }

      if (code === user.inviteCode) {
        return {
          ok: false,
          error: 'That is your own code. Share it with a friend instead.',
        }
      }

      if (friendship) {
        return {
          ok: false,
          error: 'You already have a study partner. Remove them first.',
        }
      }

      const allUsers = storage.getUsers()

      const target = allUsers.find(
        (item) => item.inviteCode === code,
      )

      if (!target) {
        return {
          ok: false,
          error: 'No profile in this browser uses that code.',
        }
      }

      const allInvites = storage.getInvites()

      const live = allInvites.filter(
        (invite) =>
          invite.status === 'pending' ||
          invite.status === 'accepted',
      )

      if (
        live.some(
          (invite) =>
            (invite.fromId === userId &&
              invite.toId === target.id) ||
            (invite.fromId === target.id &&
              invite.toId === userId),
        )
      ) {
        return {
          ok: false,
          error: `There is already a pending invitation with ${target.name}.`,
        }
      }

      if (
        live.some(
          (invite) =>
            invite.status === 'accepted' &&
            (invite.fromId === target.id ||
              invite.toId === target.id),
        )
      ) {
        return {
          ok: false,
          error: `${target.name} already has a study partner.`,
        }
      }

      setUsers(allUsers)

      saveInvites([
        ...allInvites,
        {
          id: uid(),
          fromId: userId,
          toId: target.id,
          status: 'pending',
          createdAt: Date.now(),
        },
      ])

      update((d) =>
        pushActivity(d, {
          type: 'friend',
          text: `Sent a duel invitation to ${target.name}`,
        }),
      )

      return { ok: true, name: target.name }
    },
    [
      user,
      userId,
      friendship,
      saveInvites,
      update,
    ],
  )

  const respondInvite = useCallback(
    (id, status) => {
      const all = storage.getInvites()

      const invite = all.find(
        (item) => item.id === id,
      )

      if (!invite) return

      const otherId =
        invite.fromId === userId
          ? invite.toId
          : invite.fromId

      const next = all.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status,
            respondedAt: Date.now(),
          }
        }

        const involvesPair = [
          item.fromId,
          item.toId,
        ].some(
          (personId) =>
            personId === userId ||
            personId === otherId,
        )

        if (
          status === 'accepted' &&
          item.status === 'pending' &&
          involvesPair
        ) {
          return { ...item, status: 'declined' }
        }

        return item
      })

      saveInvites(next)

      if (status === 'accepted') {
        const other = userById(otherId)

        update((d) =>
          pushActivity(d, {
            type: 'friend',
            text: `You and ${other?.name ?? 'your friend'
              } are now study partners`,
          }),
        )
      }
    },
    [saveInvites, update, userId, userById],
  )

  const removeFriend = useCallback(() => {
    if (!friendship) return

    saveInvites(
      storage.getInvites().map((invite) =>
        invite.id === friendship.id
          ? { ...invite, status: 'removed' }
          : invite,
      ),
    )
  }, [friendship, saveInvites])

  const createSimulatedProfile = useCallback(
    ({ name, goal }) => {
      const trimmed = name.trim()

      if (trimmed.length < 2) {
        return {
          ok: false,
          error: 'Give the profile a name (at least 2 characters).',
        }
      }

      if (!GOALS[goal]) {
        return {
          ok: false,
          error: 'Choose a goal for the profile.',
        }
      }

      const allUsers = storage.getUsers()

      const profile = {
        id: uid(),
        name: trimmed,
        email: null,
        goal,
        simulated: true,
        createdBy: userId,
        inviteCode: generateInviteCode(
          allUsers.map((item) => item.inviteCode),
        ),
        createdAt: Date.now(),
      }

      const nextUsers = [...allUsers, profile]

      storage.saveUsers(nextUsers)

      storage.saveUserData(
        profile.id,
        generateDemoData(goal, profile.id),
      )

      setUsers(nextUsers)

      return { ok: true, profile }
    },
    [userId],
  )

  const deleteSimulatedProfile = useCallback(
    (id) => {
      const allUsers = storage
        .getUsers()
        .filter(
          (item) =>
            !(
              item.id === id &&
              item.simulated &&
              item.createdBy === userId
            ),
        )

      storage.saveUsers(allUsers)
      setUsers(allUsers)

      saveInvites(
        storage.getInvites().filter(
          (invite) =>
            invite.fromId !== id &&
            invite.toId !== id,
        ),
      )
    },
    [saveInvites, userId],
  )

  const simulatedProfiles = useMemo(
    () =>
      users.filter(
        (item) =>
          item.simulated &&
          item.createdBy === userId,
      ),
    [users, userId],
  )

  // --------------------------------------------------
  // Reward unlocks
  // --------------------------------------------------

  useEffect(() => {
    if (!userId) return

    const fresh = evaluateUnlocks(data, {
      hasFriend: Boolean(friend),
    })

    const keys = Object.keys(fresh)

    if (!keys.length) return

    update((d) => {
      let next = {
        ...d,
        unlocked: {
          ...d.unlocked,
          ...fresh,
        },
      }

      for (const key of keys) {
        next = pushActivity(next, {
          type: 'reward',
          text: `${fresh[key].label} (+${fresh[key].xp} XP)`,
        })
      }

      return next
    })
  }, [data, friend, update, userId])

  // --------------------------------------------------
  // Context value
  // --------------------------------------------------

  const value = {
    user,
    data,
    goal: user?.goal ? GOALS[user.goal] : null,

    // Planner
    addTask,
    updateTask,
    deleteTask,
    toggleTask,
    refreshPlannerData,
    tasksLoading,
    tasksError,

    // Questions
    setQuestionCount,

    // Timetable
    saveSlot,
    deleteSlot,
    resetSchedule,

    // Weekly target
    setWeeklyTarget,

    // Friends
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

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)

  if (!ctx) {
    throw new Error(
      'useData must be used inside DataProvider',
    )
  }

  return ctx
}
