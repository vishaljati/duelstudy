
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import { GOALS } from '../lib/constants'
import { formatDate, startOfWeek, todayKey } from '../lib/dates'
import { evaluateUnlocks } from '../lib/rewards'
import { storage } from '../lib/storage'
import {
  createDefaultSchedule,
  normalizeData,
  pushActivity,
} from '../lib/userData'
import { clampInt, uid } from '../lib/utils'
import { useAuth } from './AuthContext'

import plannerService from '../services/planner.service'
import questionLogService from '../services/questionLog.service'
import friendService from '../services/friend.service'

const DataContext = createContext(null)



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

  const questionLogsRef = useRef({})
  const questionSaveQueues = useRef(new Map())
  const questionOwnerRef = useRef(userId)

  // --------------------------------------------------
  // Friends API states
  // --------------------------------------------------

  const [friends, setFriends] = useState([])
  const [incomingRequests, setIncomingRequests] = useState([])
  const [outgoingRequests, setOutgoingRequests] = useState([])

  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState('')

  const friendOwnerRef = useRef(userId)

  // --------------------------------------------------
  // Reset data when authenticated user changes
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

    refreshPlannerData().catch(() => { })
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
        setQuestionError(
          error.response?.data?.message ||
          error.message ||
          'Unable to load question tracker data.',
        )
      }

      throw error
    } finally {
      if (questionOwnerRef.current === ownerId) {
        setQuestionLoading(false)
      }
    }
  }, [userId, user?.goal])

  useEffect(() => {
    if (!userId) return

    refreshQuestionData().catch(() => { })
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

      if (!GOALS[goalId]) return false

      const isValidCategory = GOALS[goalId].categories.some(
        (category) => category.id === categoryId,
      )

      if (!isValidCategory) {
        setQuestionError('Invalid question tracker category.')
        return false
      }

      const count = clampInt(value, 0, 9999)

      const currentDay =
        questionLogsRef.current[dateKey] ?? {}

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
          text: `Logged ${count} ${label} ${GOALS[goalId].unit
            } for ${formatDate(dateKey, {
              month: 'short',
              day: 'numeric',
            })}`,
        })
      })

      setQuestionSavingCount((prev) => prev + 1)
      setQuestionError('')

      const previousSave =
        questionSaveQueues.current.get(dateKey) ??
        Promise.resolve()

      const savePromise = previousSave
        .catch(() => { })
        .then(async () => {
          if (questionOwnerRef.current !== userId) return

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

      return refreshWeeklyProgress()
    },
    [refreshWeeklyProgress],
  )

  // --------------------------------------------------
  // Friends API
  // --------------------------------------------------

  const refreshFriendsData = useCallback(async () => {
    if (!userId) return

    const ownerId = userId

    setFriendsLoading(true)
    setFriendsError('')

    try {
      const [
        friendsResponse,
        incomingResponse,
        outgoingResponse,
      ] = await Promise.all([
        friendService.getFriends(),
        friendService.getIncomingRequests(),
        friendService.getOutgoingRequests(),
      ])

      if (friendOwnerRef.current !== ownerId) return

      setFriends(
        Array.isArray(friendsResponse) ? friendsResponse : [],
      )

      setIncomingRequests(
        Array.isArray(incomingResponse) ? incomingResponse : [],
      )

      setOutgoingRequests(
        Array.isArray(outgoingResponse) ? outgoingResponse : [],
      )

      return {
        friends: friendsResponse,
        incomingRequests: incomingResponse,
        outgoingRequests: outgoingResponse,
      }
    } catch (error) {
      if (friendOwnerRef.current === ownerId) {
        setFriendsError(
          error.response?.data?.message ||
          error.message ||
          'Unable to load friends data.',
        )
      }

      throw error
    } finally {
      if (friendOwnerRef.current === ownerId) {
        setFriendsLoading(false)
      }
    }
  }, [userId])

  useEffect(() => {
    friendOwnerRef.current = userId

    setFriends([])
    setIncomingRequests([])
    setOutgoingRequests([])
    setFriendsError('')
    setFriendsLoading(false)

    if (!userId) return

    refreshFriendsData().catch(() => { })
  }, [userId, refreshFriendsData])

  // Current UI supports one study partner.
  const friendship = friends[0] ?? null
  const friend = friendship?.friend ?? null

  const searchUsers = useCallback(
    async (query) => {
      if (!userId || !query?.trim()) return []

      return friendService.searchUsers(query.trim())
    },
    [userId],
  )

  const sendInvite = useCallback(
    async (rawCode) => {
      if (!user) {
        return {
          ok: false,
          error: 'You must be logged in.',
        }
      }

      const code = rawCode.trim().toUpperCase()

      if (!/^DUEL-[A-Z0-9]{8}$/.test(code)) {
        return { ok: false, error: 'Codes look like DUEL-88E7398C.' }
      }

      if (code === user.inviteCode) {
        return {
          ok: false,
          error: 'That is your own code. Share it with a friend instead.',
        }
      }

      if (friend) {
        return {
          ok: false,
          error: 'You already have a study partner. Remove them first.',
        }
      }

      try {
        const result = await friendService.sendFriendRequest(code)

        await refreshFriendsData()

        return {
          ok: true,
          name:
            result?.receiver?.name ||
            result?.friend?.name ||
            result?.name ||
            'your study partner',
        }
      } catch (error) {
        return {
          ok: false,
          error:
            error.response?.data?.message ||
            error.message ||
            'Unable to send invitation.',
        }
      }
    },
    [user, friend, refreshFriendsData],
  )

  const sendFriendRequestToUser = useCallback(
    async (targetUserId) => {
      if (!userId) {
        return {
          ok: false,
          error: 'You must be logged in.',
        }
      }

      if (!targetUserId) {
        return {
          ok: false,
          error: 'Invalid user.',
        }
      }

      if (friend) {
        return {
          ok: false,
          error: 'You already have a study partner. Remove them first.',
        }
      }

      try {
        await friendService.sendFriendRequestToUser(targetUserId)

        await refreshFriendsData()

        return {
          ok: true,
          message: 'Friend request sent successfully.',
        }
      } catch (error) {
        return {
          ok: false,
          error:
            error.response?.data?.message ||
            error.message ||
            'Unable to send friend request.',
        }
      }
    },
    [userId, friend, refreshFriendsData],
  )

  const respondInvite = useCallback(
    async (requestId, status) => {
      if (!userId) return { ok: false }

      try {
        if (status === 'accepted') {
          await friendService.acceptFriendRequest(requestId)
        } else if (status === 'rejected') {
          await friendService.rejectFriendRequest(requestId)
        } else {
          return {
            ok: false,
            error: 'Invalid invitation response.',
          }
        }

        await refreshFriendsData()

        return { ok: true }
      } catch (error) {
        return {
          ok: false,
          error:
            error.response?.data?.message ||
            error.message ||
            'Unable to respond to invitation.',
        }
      }
    },
    [userId, refreshFriendsData],
  )

  const cancelInvite = useCallback(
    async (requestId) => {
      if (!userId) return { ok: false }

      try {
        await friendService.cancelFriendRequest(requestId)
        await refreshFriendsData()

        return { ok: true }
      } catch (error) {
        return {
          ok: false,
          error:
            error.response?.data?.message ||
            error.message ||
            'Unable to cancel invitation.',
        }
      }
    },
    [userId, refreshFriendsData],
  )

  const removeFriend = useCallback(async () => {
    if (!userId || !friend) {
      return {
        ok: false,
        error: 'No study partner found.',
      }
    }

    try {
      const friendId = friend._id || friend.id

      await friendService.removeFriend(friendId)
      await refreshFriendsData()

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error:
          error.response?.data?.message ||
          error.message ||
          'Unable to remove study partner.',
      }
    }
  }, [userId, friend, refreshFriendsData])

  const compareFriend = useCallback(async () => {
    if (!friend) return null

    const friendId = friend._id || friend.id

    return friendService.compareFriend(friendId)
  }, [friend])

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
    friends,
    friend,
    incomingRequests,
    outgoingRequests,
    friendsLoading,
    friendsError,
    refreshFriendsData,
    searchUsers,
    sendInvite,
    sendFriendRequestToUser,
    respondInvite,
    cancelInvite,
    removeFriend,
    compareFriend,
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
