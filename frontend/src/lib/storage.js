// Single gateway for every localStorage read/write in the app.
const PREFIX = 'duelstudy:'

const KEYS = {
  users: 'users',
  session: 'session',
  invites: 'invites',
  userData: (userId) => `data:${userId}`,
}

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function remove(key) {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    // Storage unavailable (private mode / quota); nothing to clean up.
  }
}

export const storage = {
  getUsers: () => read(KEYS.users, []),
  saveUsers: (users) => write(KEYS.users, users),

  getSession: () => read(KEYS.session, null),
  setSession: (userId) => write(KEYS.session, userId),
  clearSession: () => remove(KEYS.session),

  getUserData: (userId) => read(KEYS.userData(userId), null),
  saveUserData: (userId, data) => write(KEYS.userData(userId), data),

  getInvites: () => read(KEYS.invites, []),
  saveInvites: (invites) => write(KEYS.invites, invites),

  isAppKey: (key) => typeof key === 'string' && key.startsWith(PREFIX),
}
