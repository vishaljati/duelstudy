import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { formatDate, formatHours, todayKey } from '../../lib/dates'
import { weekStats } from '../../lib/stats'
import { BarChart } from '../ui/BarChart'
import { Card, CardHeader } from '../ui/Card'
import { EmptyState, Segmented } from '../ui/Misc'

export function WeeklyChart() {
  const { data, goal } = useData()
  const [metric, setMetric] = useState('hours')
  const today = todayKey()
  const week = weekStats(data, today)
  const isEmpty = metric === 'hours' ? week.minutes === 0 : week.questions === 0

  const chartData = week.days.map((d) => ({
    key: d.key,
    label: formatDate(d.key, { weekday: 'narrow' }),
    highlight: d.key === today,
    values: metric === 'hours' ? { minutes: d.minutes } : d.byCategory,
  }))
  const series = metric === 'hours' ? [{ id: 'minutes', label: 'Study time', color: 'bg-accent' }] : goal.categories

  return (
    <Card>
      <CardHeader
        icon={BarChart3}
        title="Weekly performance"
        description={metric === 'hours' ? `${formatHours(week.minutes)} studied this week` : `${week.questions} ${goal.unit} this week`}
        action={
          <Segmented
            label="Chart metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'hours', label: 'Hours' },
              { value: 'questions', label: goal.unit === 'problems' ? 'Problems' : 'Questions' },
            ]}
          />
        }
      />
      {isEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="No activity this week yet"
          description={metric === 'hours' ? 'Completed tasks add their duration to your study hours.' : `Log ${goal.unit} in the Question Tracker to fill this chart.`}
        />
      ) : (
        <BarChart
          label={metric === 'hours' ? 'Study hours per day this week' : `${goal.unit} per day this week`}
          data={chartData}
          series={series}
          formatValue={metric === 'hours' ? formatHours : (v) => v}
        />
      )}
    </Card>
  )
}
