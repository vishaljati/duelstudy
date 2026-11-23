import { LoaderCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-strong shadow-[0_0_0_1px_rgba(62,230,168,0.2)]',
  secondary: 'bg-surface-2 text-fg border border-border hover:border-accent/40',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
}

const sizes = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
  icon: 'size-9 rounded-lg',
}

export function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}) {
  const isButton = Component === 'button'
  return (
    <Component
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center gap-2 font-medium transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        variants[variant],
        sizes[size],
        className,
      )}
      {...(isButton && { type: props.type ?? 'button', disabled: disabled || loading })}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  )
}
