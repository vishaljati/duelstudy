import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export function TaskCheckbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? `Mark “${label}” as not done` : `Mark “${label}” as done`}
      onClick={onChange}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        checked ? 'border-accent bg-accent text-accent-fg' : 'border-border hover:border-accent/60',
      )}
    >
      {checked && <Check className="size-3.5 animate-pop" strokeWidth={3} aria-hidden="true" />}
    </button>
  )
}
