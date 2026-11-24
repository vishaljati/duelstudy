
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
import questionLogService from '../services/questionLog.service'

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
    questionLogs: {},
    tasks: [],
    weeklyProgress: null,
  }))

  const [users, setUsers] = useState(() => storage.getUsers())
  const [invites, setInvites] = useState(() => storage.getInvites())

  // --------------------------------------------------
  // Planner states
  // --------------------------------------------------

  const [tasksLoading, setTasksLoading] = useState(false)
  const [tasksError, setTasksError] = useState('')

  const activeWeekStart = useRef(startOfWeek(todayKey()))

  // --------------------------------------------------
  // Question tracker states
  // --------------------------------------------------

  const [questionLoading, setQuestionLoading] = useState(false)
  const [questionSavingCount, setQuestionSavingCount] = useState(0)
  const [questionError, setQuestionError] = useState('')
  const [questionConfig, setQuestionConfig] = useState(null)

  // Keep the latest question data outside React state so that
  // rapid updates always use the latest metrics.
  const questionLogsRef = useRef({})

  // Serialize saves for each date independently.
  const questionSaveQueues = useRef(new Map())

  // Prevent responses from an old user updating the current user.
  const questionOwnerRef = useRef(userId)

  // --------------------------------------------------
  // Reset data when the authenticated user changes
  // --------------------------------------------------

  useEffect(() => {
    questionOwnerRef.current = userId
    questionLogsRef.current = {}
    questionSaveQueues.current.clear()

    setQuestionLoading(false)
    setQuestionSavingCount(0)
    setQuestionError('')
    setQuestionConfig(null)

    if (!userId) {
      setData({
        ...normalizeData(null),
        questionLogs: {},
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
      questionLogs: {},
      tasks: [],
      weeklyProgress: null,
    })

    setTasksError('')
    setTasksLoading(false)

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

        // These fields are API-owned and must not be stored locally.
        const {
          tasks,
          weeklyProgress,
          weeklyTargetHours,
          questionLogs,
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

    refreshPlannerData().catch(() => {})
  }, [userId, refreshPlannerData])

  // --------------------------------------------------
  // QuestionLog API
  // --------------------------------------------------

  const refreshQuestionData = useCallback(async () => {
    if (!userId) return

    const ownerId = userId

    setQuestionLoading(true)
    setQuestionError('')

    try {
      const [config, logsResponse] = await Promise.all([
        questionLogService.getConfig(),
        questionLogService.getLogs(),
      ])

      // Ignore responses belonging to a previous account.
      if (questionOwnerRef.current !== ownerId) return

      if (config.goal !== user?.goal) {
        throw new Error(
          'Question tracker goal does not match your account.',
        )
      }

      if (!Array.isArray(config.metrics)) {
        throw new Error(
          'Invalid question tracker configuration received.',
        )
      }

      const logs = Array.isArray(logsResponse)
        ? logsResponse
        : logsResponse?.logs ?? []

      const questionLogs = {}

      for (const log of logs) {
        const dateKey = new Date(log.date)
          .toISOString()
          .slice(0, 10)

        const metrics =
          log.metrics instanceof Map
            ? Object.fromEntries(log.metrics)
            : { ...(log.metrics ?? {}) }

        questionLogs[dateKey] = metrics
      }

      // Do not overwrite optimistic data for dates that
      // currently have saves in progress.
      for (const dateKey of questionSaveQueues.current.keys()) {
        if (questionLogsRef.current[dateKey]) {
          questionLogs[dateKey] = {
            ...questionLogsRef.current[dateKey],
          }
        }
      }

      questionLogsRef.current = questionLogs

      setQuestionConfig(config)

      setData((prev) => ({
        ...prev,
        questionLogs,
      }))

      return questionLogs
    } catch (error) {
      if (questionOwnerRef.current === ownerId) {
        const message =
          error.response?.data?.message ||
          error.message ||
          'Unable to load question tracker data.'

        setQuestionError(message)
      }

      throw error
    } finally {
      if (questionOwnerRef.current === ownerId) {
        setQuestionLoading(false)
      }
    }
  }, [userId, user?.goal])

  // Load question configuration and history after login.
  useEffect(() => {
    if (!userId) return

    refreshQuestionData().catch(() => {})
  }, [userId, refreshQuestionData])

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
    async (dateKey, categoryId, value) => {
      if (!userId || questionOwnerRef.current !== userId) {
        return false
      }

      const goalId = user?.goal

      if (!GOALS[goalId]) {
        return false
      }

      const isValidCategory = GOALS[goalId].categories.some(
        (category) => category.id === categoryId,
      )

      if (!isValidCategory) {
        setQuestionError('Invalid question tracker category.')
        return false
      }

      const count = clampInt(value, 0, 9999)

      // Read the latest data from the ref, not a stale render.
      const currentDay =
        questionLogsRef.current[dateKey] ?? {}

      // Always submit the complete daily metrics object.
      const updatedDay = {
        ...currentDay,
        [categoryId]: count,
      }

      const updatedLogs = {
        ...questionLogsRef.current,
        [dateKey]: updatedDay,
      }

      questionLogsRef.current = updatedLogs

      const label =
        GOALS[goalId].categories.find(
          (category) => category.id === categoryId,
        )?.label ?? categoryId

      // Optimistic UI update.
      update((prev) => {
        const next = {
          ...prev,
          questionLogs: updatedLogs,
        }

        const activityRef = `q:${dateKey}:${categoryId}`

        if (count === 0) {
          return {
            ...next,
            activity: next.activity.filter(
              (activity) => activity.ref !== activityRef,
            ),
          }
        }

        return pushActivity(next, {
          type: 'questions',
          ref: activityRef,
          text: `Logged ${count} ${label} ${
            GOALS[goalId].unit
          } for ${formatDate(dateKey, {
            month: 'short',
            day: 'numeric',
          })}`,
        })
      })

      setQuestionSavingCount((prev) => prev + 1)
      setQuestionError('')

      // Wait for the previous save for this date.
      const previousSave =
        questionSaveQueues.current.get(dateKey) ??
        Promise.resolve()

      const savePromise = previousSave
        .catch(() => {})
        .then(async () => {
          if (questionOwnerRef.current !== userId) {
            return
          }

          // Read the latest metrics when this queued request runs.
          const latestMetrics = {
            ...(questionLogsRef.current[dateKey] ?? {}),
          }

          await questionLogService.saveDailyLog({
            date: dateKey,
            metrics: latestMetrics,
          })
        })

      questionSaveQueues.current.set(dateKey, savePromise)

      try {
        await savePromise

        if (
          questionOwnerRef.current === userId &&
          questionSaveQueues.current.get(dateKey) === savePromise
        ) {
          setQuestionError('')
        }

        return true
      } catch (error) {
        if (
          questionOwnerRef.current === userId &&
          questionSaveQueues.current.get(dateKey) === savePromise
        ) {
          setQuestionError(
            error.response?.data?.message ||
              error.message ||
              'Unable to save question count.',
          )
        }

        return false
      } finally {
        if (questionOwnerRef.current === userId) {
          setQuestionSavingCount((prev) =>
            Math.max(0, prev - 1),
          )

          if (
            questionSaveQueues.current.get(dateKey) === savePromise
          ) {
            questionSaveQueues.current.delete(dateKey)
          }
        }
      }
    },
    [userId, user?.goal, update],
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

  const friendship =
    myInvites.find(
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
            text: `You and ${
              other?.name ?? 'your friend'
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
    refreshQuestionData,
    questionLoading,
    questionSaving: questionSavingCount > 0,
    questionError,
    questionConfig,

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
