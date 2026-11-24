import { Code, Lock, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '../components/auth/AuthLayout'
import { PasswordInput } from '../components/auth/PasswordInput'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { useAuth } from '../context/AuthContext'
import { GOALS } from '../lib/constants'
import { cn } from '../lib/utils'

const GOAL_ICONS = { NEET: Stethoscope, CSE: Code }

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', goal: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined, form: undefined }))
  }


const onSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  setErrors({});

  try {
    const result = await signup(form);

    if (!result.ok) {
      setErrors(result.errors || {});
      return;
    }

    navigate("/dashboard", { replace: true });
  } finally {
    setSubmitting(false);
  }
};


  return (
    <AuthLayout
      title="Create your account"
      description="Start with a fresh dashboard built around your goal."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Log in
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
        <Field label="Name" error={errors.name}>
          {(p) => <Input {...p} autoComplete="name" placeholder="Your full name" value={form.name} onChange={set('name')} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="Password" error={errors.password} hint="At least 6 characters.">
          {(p) => <PasswordInput {...p} autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={set('password')} />}
        </Field>

        <fieldset aria-describedby="goal-note">
          <legend className="mb-1.5 text-sm font-medium">Academic goal</legend>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(GOALS).map((goal) => {
              const Icon = GOAL_ICONS[goal.id]
              const selected = form.goal === goal.id
              return (
                <label
                  key={goal.id}
                  className={cn(
                    'relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent',
                    selected ? 'border-accent bg-accent/10' : 'border-border bg-bg hover:border-accent/40',
                  )}
                >
                  <input type="radio" name="goal" value={goal.id} checked={selected} onChange={set('goal')} className="sr-only" />
                  <Icon className={cn('size-5', selected ? 'text-accent' : 'text-muted')} aria-hidden="true" />
                  <span className="font-display text-lg font-semibold">{goal.label}</span>
                  <span className="text-xs text-muted">{goal.tagline}</span>
                </label>
              )
            })}
          </div>
          {errors.goal ? (
            <p className="mt-1.5 text-xs text-danger" role="alert">
              {errors.goal}
            </p>
          ) : (
            <p id="goal-note" className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Lock className="size-3.5" aria-hidden="true" />
              Your goal is permanent and can&apos;t be changed later.
            </p>
          )}
        </fieldset>

        <Button type="submit" size="lg" loading={submitting} className="mt-2">
          {submitting ? 'Creating account…' : 'Get started'}
        </Button>
      </form>
    </AuthLayout>
  )
}
