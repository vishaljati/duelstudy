import { cn } from '../../lib/utils'

export function ProgressBar({ value, max = 100, className, barClassName = 'bg-accent', label }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', barClassName)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function ProgressRing({ value, max = 100, size = 72, stroke = 7, children, label }) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
