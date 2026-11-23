import { useId } from 'react'
import { cn } from '../../lib/utils'

const controlClass =
  'w-full rounded-xl border border-border bg-bg px-3.5 h-11 text-sm text-fg placeholder:text-muted/70 transition focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-danger/60'

export function Field({ label, error, hint, children, className }) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ className, ...props }) {
  return <input className={cn(controlClass, className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(controlClass, 'appearance-none pr-9 bg-[length:16px] bg-[right_12px_center] bg-no-repeat', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238d9993' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  )
}
