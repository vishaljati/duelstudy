import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import { QuickLinks } from '../components/dashboard/QuickLinks'
import { StatsOverview } from '../components/dashboard/StatsOverview'
import { SubjectCounts } from '../components/dashboard/SubjectCounts'
import { TodayChecklist } from '../components/dashboard/TodayChecklist'
import { UpNext } from '../components/dashboard/UpNext'
import { WeeklyChart } from '../components/dashboard/WeeklyChart'
import { Chip } from '../components/ui/Misc'
import { useData } from '../context/DataContext'
import { formatDate, greeting, todayKey } from '../lib/dates'

export default function Dashboard() {
  const { user } = useData()
  const firstName = user.name.split(' ')[0]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="border-accent/25 bg-accent/10 text-accent">{user.goal}</Chip>
          <span className="text-sm text-muted">{formatDate(todayKey(), { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <h1 className="text-2xl font-bold text-balance sm:text-3xl">
          {greeting()}, {firstName}
        </h1>
      </header>

      <StatsOverview />
      <QuickLinks />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <TodayChecklist />
          <WeeklyChart />
        </div>
        <div className="flex flex-col gap-6">
          <UpNext />
          <SubjectCounts />
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}
