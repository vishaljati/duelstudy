import {
  CalendarDays,
  Clock,
  Gift,
  House,
  LogOut,
  Swords,
  Target,
  Trophy,
  User,
  UserPlus,
  Zap,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { totalXP } from '../../lib/stats'
import { cn } from '../../lib/utils'
import { Avatar, Logo } from '../ui/Misc'

const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Home', icon: House },
  { to: '/competition', label: 'Competition', icon: Swords },
  { to: '/rewards', label: 'Rewards', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
]

const STUDY_NAV = [
  { to: '/planner', label: 'Planner', icon: CalendarDays },
  { to: '/questions', label: 'Questions', icon: Target },
  { to: '/timetable', label: 'Timetable', icon: Clock },
  { to: '/friends', label: 'Friends', icon: UserPlus },
]

function SidebarLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg',
        )
      }
    >
      <Icon className="size-4.5" aria-hidden="true" />
      {label}
    </NavLink>
  )
}

function XPChip() {
  const { data } = useData()
  return (
    <NavLink
      to="/rewards"
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent tabular-nums"
    >
      <Zap className="size-3.5" aria-hidden="true" />
      {totalXP(data).toLocaleString()} XP
    </NavLink>
  )
}

export function AppShell() {
  const { logout } = useAuth()
  const { user } = useData()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const result = await logout();

    if (!result.ok) {
      console.error(result.message);
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface/50 p-4 lg:flex">
        <NavLink to="/dashboard" className="mb-8 px-2 pt-2" aria-label="DUELSTUDY home">
          <Logo />
        </NavLink>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>
        <p className="mb-2 mt-6 px-3 text-xs font-medium uppercase tracking-wider text-muted/70">Study</p>
        <nav aria-label="Study tools" className="flex flex-col gap-1">
          {STUDY_NAV.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted">{user.goal} aspirant</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-fg"
            aria-label="Log out"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <NavLink to="/dashboard" aria-label="DUELSTUDY home">
            <Logo className="text-base" />
          </NavLink>
          <div className="flex items-center gap-2">
            <XPChip />
            <NavLink
              to="/friends"
              className="rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-fg"
              aria-label="Friends"
            >
              <UserPlus className="size-5" aria-hidden="true" />
            </NavLink>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <div className="mb-6 hidden justify-end lg:flex">
            <XPChip />
          </div>
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                    isActive ? 'text-accent' : 'text-muted hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition', isActive && 'bg-accent/15')}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export { STUDY_NAV }
