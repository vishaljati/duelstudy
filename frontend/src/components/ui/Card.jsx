import { cn } from '../../lib/utils'

export function Card({ as: Component = 'section', className, ...props }) {
  return <Component className={cn('rounded-2xl border border-border bg-surface p-5', className)} {...props} />
}

export function CardHeader({ title, description, icon: Icon, action, className }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg text-pretty">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted text-pretty">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
