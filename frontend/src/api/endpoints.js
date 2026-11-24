
const API = {

  // PHASE 1: AUTHENTICATION & USER
  USER: {
    REGISTER: "/users/register",
    LOGIN: "/users/login",
    LOGOUT: "/users/logout",
    ME: "/users/me",
    REFRESH_TOKEN: "/users/refresh-token",
    CHANGE_PASSWORD: "/users/change-password",
    UPDATE_ACCOUNT: "/users/update-account",
  },




  // ==========================================
  // PHASE 2: STUDY PLANNER
  // ==========================================
  PLANNER: {
    TASKS: "/planner/tasks",
    TASK_BY_ID: (id) => `/planner/tasks/${id}`,
    TASK_STATUS: (id) => `/planner/tasks/${id}/status`,

    WEEKLY_PROGRESS: "/planner/weekly-progress",
    WEEKLY_TARGET: "/planner/weekly-target",
  },

  // ==========================================
  // PHASE 3: QUESTION / PROGRESS TRACKER
  // ==========================================
  QUESTIONS: {
    CONFIG: "/questions/config",
    DAILY_SUMMARY: "/questions/daily-summary",
    WEEKLY_SUMMARY: "/questions/weekly-summary",

    LOGS: "/questions/logs",
    LOG_BY_ID: (id) => `/questions/logs/${id}`,
  },

  // ==========================================
  // PHASE 4: TIMETABLE
  // ==========================================
  TIMETABLE: {
    BASE: "/timetable",
    SLOT_BY_ID: (id) => `/timetable/${id}`,
    RESET: "/timetable/reset",
  },

  // ==========================================
  // PHASE 5: ACTIVITY TRACKER
  // ==========================================
  ACTIVITY: {
    LOG: "/activity/log",
    TODAY: "/activity/today",
    CALENDAR: "/activity/calendar",
    STREAK: "/activity/streak",
  },

  // ==========================================
  // PHASE 6: FRIENDS & INVITATIONS
  // ==========================================
  FRIENDS: {
    BASE: "/friends",
    INVITE: "/friends/invite",

    INCOMING_REQUESTS: "/friends/requests/incoming",
    OUTGOING_REQUESTS: "/friends/requests/outgoing",

    ACCEPT_REQUEST: (id) => `/friends/requests/${id}/accept`,
    REJECT_REQUEST: (id) => `/friends/requests/${id}/reject`,
    CANCEL_REQUEST: (id) => `/friends/requests/${id}`,

    REMOVE_FRIEND: (friendId) => `/friends/${friendId}`,
    COMPARE_FRIEND: (friendId) => `/friends/${friendId}/compare`,
  },

  // ==========================================
  // PHASE 7: COMPETITION
  // ==========================================
  COMPETITION: {
    WEEKLY_LEADERBOARD: "/competition/leaderboard/weekly",
    BADGES: "/competition/badges",

    CHALLENGES: "/competition/challenges",
    CHALLENGE_BY_ID: (id) => `/competition/challenges/${id}`,
    JOIN_CHALLENGE: (id) => `/competition/challenges/${id}/join`,
  },
};

export default API;
