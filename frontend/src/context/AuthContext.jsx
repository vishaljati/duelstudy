import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { hashPassword, validateLogin, validateSignup } from '../lib/auth'
import { storage } from '../lib/storage'
import { createFreshData } from '../lib/userData'
import { generateInviteCode, uid } from '../lib/utils'

const AuthContext = createContext(null)

const findSessionUser = () => {
  const id = storage.getSession()
  if (!id) return null
  return storage.getUsers().find((u) => u.id === id && !u.simulated) ?? null
}

const publicUser = (user) => {
  if (!user) return null
  const { passwordHash: _hash, salt: _salt, ...rest } = user
  return rest
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => publicUser(findSessionUser()))

  const signup = useCallback(async (input) => {
    const errors = validateSignup(input)
    if (Object.keys(errors).length) return { ok: false, errors }

    const users = storage.getUsers()
    const email = input.email.trim().toLowerCase()
    if (users.some((u) => u.email === email)) {
      return { ok: false, errors: { email: 'An account with this email already exists.' } }
    }

    const salt = uid()
    const newUser = {
      id: uid(),
      name: input.name.trim(),
      email,
      goal: input.goal,
      salt,
      passwordHash: await hashPassword(input.password, salt),
      inviteCode: generateInviteCode(users.map((u) => u.inviteCode)),
      createdAt: Date.now(),
    }

    if (!storage.saveUsers([...users, newUser])) {
      return { ok: false, errors: { form: 'Could not save your account. Is browser storage enabled?' } }
    }
    storage.saveUserData(newUser.id, createFreshData(newUser.goal))
    storage.setSession(newUser.id)
    setUser(publicUser(newUser))
    return { ok: true }
  }, [])

  const login = useCallback(async (input) => {
    const errors = validateLogin(input)
    if (Object.keys(errors).length) return { ok: false, errors }

    const email = input.email.trim().toLowerCase()
    const account = storage.getUsers().find((u) => u.email === email && !u.simulated)
    const hash = account ? await hashPassword(input.password, account.salt) : null
    if (!account || hash !== account.passwordHash) {
      return { ok: false, errors: { form: 'Incorrect email or password.' } }
    }
    storage.setSession(account.id)
    setUser(publicUser(account))
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    storage.clearSession()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, signup, login, logout }), [user, signup, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
