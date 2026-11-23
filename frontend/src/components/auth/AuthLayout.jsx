import { Link } from 'react-router'
import { Logo } from '../ui/Misc'

export function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />
      <Link to="/" className="relative mb-8" aria-label="DUELSTUDY home">
        <Logo />
      </Link>
      <main className="relative w-full max-w-md animate-rise rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
        <div className="mt-6">{children}</div>
      </main>
      <p className="relative mt-6 text-sm text-muted">{footer}</p>
      <p className="relative mt-3 max-w-sm text-center text-xs text-muted/70">
        Accounts are stored only in this browser — a frontend simulation, not a real server.
      </p>
    </div>
  )
}
