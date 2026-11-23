import { Flame, Swords } from 'lucide-react'
import { Avatar } from '../ui/Misc'
import { ProgressBar } from '../ui/Progress'

const ROWS = [
  { label: 'Study hours', a: 28, b: 24, unit: 'h' },
  { label: 'Questions', a: 412, b: 455, unit: '' },
  { label: 'Streak', a: 9, b: 6, unit: 'd' },
]

// Purely illustrative marketing visual — not tied to any account data.
export function HeroPreview() {
  return (
    <div className="relative animate-rise [animation-delay:120ms]" aria-hidden="true">
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-2xl shadow-black/50 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">This week&apos;s duel</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">Example</span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name="You" />
            <div>
              <p className="font-semibold">You</p>
              <p className="text-xs text-muted">NEET</p>
            </div>
          </div>
          <span className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Swords className="size-5" />
          </span>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="font-semibold">Partner</p>
              <p className="text-xs text-muted">NEET</p>
            </div>
            <Avatar name="Study Partner" className="bg-info/15 text-info ring-info/25" />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          {ROWS.map((r) => {
            const max = Math.max(r.a, r.b)
            return (
              <div key={r.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className={r.a >= r.b ? 'font-semibold text-accent' : 'text-muted'}>
                    {r.a}
                    {r.unit}
                  </span>
                  <span className="text-muted">{r.label}</span>
                  <span className={r.b > r.a ? 'font-semibold text-info' : 'text-muted'}>
                    {r.b}
                    {r.unit}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <ProgressBar value={r.a} max={max} className="rotate-180" />
                  <ProgressBar value={r.b} max={max} barClassName="bg-info" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 shadow-xl sm:-left-6">
        <span className="flex size-9 items-center justify-center rounded-xl bg-warn/15 text-warn">
          <Flame className="size-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold">9-day streak</p>
          <p className="text-xs text-muted">+80 XP badge unlocked</p>
        </div>
      </div>
    </div>
  )
}
