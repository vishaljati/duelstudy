import { ArrowRight, CalendarDays, Flame, Gift, Swords, Target, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'
import { HeroPreview } from '../components/landing/HeroPreview'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Misc'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { icon: CalendarDays, title: 'Study Planning', text: 'Plan every day of your week with tasks, subjects, times and priorities.' },
  { icon: TrendingUp, title: 'Weekly Targets', text: 'Set an hours target and watch completed study time close the gap.' },
  { icon: Flame, title: 'Streaks', text: 'Show up daily. Every active day extends your streak — miss one and it resets.' },
  { icon: Target, title: 'Question Tracking', text: 'Log Physics, Chemistry, Biology — or LeetCode and Web Dev — every day.' },
  { icon: Swords, title: 'Competition', text: 'Invite one study partner and compare hours, questions and streaks weekly.' },
  { icon: Gift, title: 'Rewards', text: 'Earn XP, unlock badges and clear daily and weekly challenges.' },
]

const STEPS = [
  { n: '01', title: 'Pick your goal', text: 'Choose NEET or CSE at signup. Your trackers adapt to your exam.' },
  { n: '02', title: 'Plan and log', text: 'Schedule tasks, follow your timetable and log what you solve.' },
  { n: '03', title: 'Duel a friend', text: 'Share your invite code and compete on a weekly leaderboard.' },
]

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="relative overflow-x-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[56rem] max-w-[200%] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Link to="/" aria-label="DUELSTUDY home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2" aria-label="Account">
          {user ? (
            <Button as={Link} to="/dashboard" size="sm">
              Open dashboard
            </Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" size="sm">
                Login
              </Button>
              <Button as={Link} to="/signup" size="sm">
                Get Started
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Built for NEET &amp; CSE aspirants
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] text-balance sm:text-5xl lg:text-6xl">
              Study harder. <span className="text-accent">Duel smarter.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted text-pretty sm:text-lg">
              DUELSTUDY turns preparation into a friendly rivalry. Plan your week, log every question you solve, protect your streak — and
              see exactly how you stack up against your study partner.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to={user ? '/dashboard' : '/signup'} size="lg">
                {user ? 'Go to dashboard' : 'Get Started — it’s free'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              {!user && (
                <Button as={Link} to="/login" variant="secondary" size="lg">
                  Login
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">No credit card. Your data stays in your browser.</p>
          </div>
          <HeroPreview />
        </section>

        <section aria-labelledby="features-title" className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="text-sm font-medium text-accent">Everything in one place</p>
            <h2 id="features-title" className="mt-2 max-w-xl text-3xl font-bold text-balance sm:text-4xl">
              The toolkit for consistent, competitive studying
            </h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="group rounded-2xl border border-border bg-surface p-6 transition hover:-translate-y-0.5 hover:border-accent/40">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:bg-accent group-hover:text-accent-fg">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted text-pretty">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="how-title" className="text-3xl font-bold sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="border-l-2 border-accent/40 pl-5">
                <span className="font-display text-sm font-semibold text-accent">{s.n}</span>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/15 via-surface to-surface p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-2xl font-bold text-balance sm:text-3xl">Your next streak starts today.</h2>
              <p className="mt-2 text-muted">Create an account in under a minute.</p>
            </div>
            <Button as={Link} to={user ? '/dashboard' : '/signup'} size="lg">
              {user ? 'Open dashboard' : 'Get Started'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
          <Logo className="text-base" />
          <p>Frontend demo · data stored locally in your browser.</p>
        </div>
      </footer>
    </div>
  )
}
