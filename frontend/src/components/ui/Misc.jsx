import { cn, initials } from '../../lib/utils'

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center', className)}>
      {Icon && (
        <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <p className="font-medium text-fg text-balance">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted text-pretty">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Chip({ className, children, ...props }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted', className)}
      {...props}
    >
      {children}
    </span>
  )
}

export function PageHeader({ title, description, action }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-balance sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted text-pretty sm:text-base">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </header>
  )
}

export function StatCard({ icon: Icon, label, value, sub, children, className, tone = 'accent' }) {
  const tones = { accent: 'bg-accent/10 text-accent', warn: 'bg-warn/10 text-warn', info: 'bg-info/10 text-info' }
  return (
    <div className={cn('flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
        {Icon && (
          <span className={cn('flex size-8 items-center justify-center rounded-lg', tones[tone])}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <div>
        <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export function Avatar({ name, size = 'md', className }) {
  const sizes = { sm: 'size-8 text-xs', md: 'size-11 text-sm', lg: 'size-16 text-xl' }
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-display font-semibold text-accent ring-1 ring-accent/25', sizes[size], className)}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

export function Segmented({ options, value, onChange, label, className }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-xl border border-border bg-surface p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            value === o.value ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Logo({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 6.5 21 18v3h-3l-1-1" />
        </svg>
      </span>
      <span>
        DUEL<span className="text-accent">STUDY</span>
      </span>
    </span>
  )
}
