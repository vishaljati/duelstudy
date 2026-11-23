// Frontend-only credential handling. Passwords are hashed before being kept in
// localStorage, but this is a simulation and not a substitute for a real backend.
export async function hashPassword(password, salt) {
  const input = `${salt}:${password}`
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Array.from(new Uint8Array(bytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h = 0
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  return `fallback-${h >>> 0}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateSignup({ name, email, password, goal }) {
  const errors = {}
  if (!name || name.trim().length < 2) errors.name = 'Enter your name (at least 2 characters).'
  if (!email || !EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters.'
  if (goal !== 'NEET' && goal !== 'CSE') errors.goal = 'Choose your academic goal.'
  return errors
}

export function validateLogin({ email, password }) {
  const errors = {}
  if (!email || !EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Enter your password.'
  return errors
}
