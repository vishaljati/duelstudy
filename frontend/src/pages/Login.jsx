import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AuthLayout } from '../components/auth/AuthLayout'
import { PasswordInput } from '../components/auth/PasswordInput'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined, form: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const result = await login(form)
    setSubmitting(false)
    if (!result.ok) return setErrors(result.errors)
    navigate(location.state?.from ?? '/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to continue your streak."
      footer={
        <>
          New to DUELSTUDY?{' '}
          <Link to="/signup" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {errors.form && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {errors.form}
          </p>
        )}
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" placeholder="Your password" value={form.password} onChange={set('password')} />}
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="mt-2">
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
