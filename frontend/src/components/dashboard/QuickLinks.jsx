import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { STUDY_NAV } from '../layout/AppShell'

const DESCRIPTIONS = {
  '/planner': 'Plan this week',
  '/questions': 'Log today',
  '/timetable': 'Daily schedule',
  '/friends': 'Invite & duel',
}

export function QuickLinks() {
  return (
    <nav aria-label="Study tools" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
      {STUDY_NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition hover:border-accent/40 active:scale-[0.98]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{label}</span>
            <span className="block truncate text-xs text-muted">{DESCRIPTIONS[to]}</span>
          </span>
          <ChevronRight className="size-4 text-muted transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  )
}
