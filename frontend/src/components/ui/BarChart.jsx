import { cn } from '../../lib/utils'

/**
 * Stacked bar chart built from plain elements.
 * data: [{ key, label, values: { [seriesId]: number }, highlight }]
 * series: [{ id, label, color }]
 */
export function BarChart({ data, series, height = 168, formatValue = (v) => v, label }) {
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.id] || 0), 0))
  const max = Math.max(1, ...totals)

  return (
    <figure aria-label={label}>
      <div className="flex items-stretch gap-1.5 sm:gap-3" style={{ height }} aria-hidden="true">
        {data.map((d, i) => (
          <div key={d.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className={cn('text-[11px] tabular-nums', totals[i] ? 'text-muted' : 'text-transparent')}>
              {totals[i] ? formatValue(totals[i]) : '0'}
            </span>
            <div className="relative flex w-full flex-1 items-end justify-center">
              <div
                className={cn(
                  'flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-md transition-[height] duration-500 ease-out',
                  totals[i] ? '' : 'bg-surface-2',
                )}
                style={{ height: totals[i] ? `${Math.max(4, (totals[i] / max) * 100)}%` : '4px' }}
              >
                {series.map((s) => {
                  const v = d.values[s.id] || 0
                  if (!v) return null
                  return <div key={s.id} className={cn(s.color, !d.highlight && 'opacity-60')} style={{ height: `${(v / totals[i]) * 100}%` }} />
                })}
              </div>
            </div>
            <span className={cn('text-xs', d.highlight ? 'font-semibold text-fg' : 'text-muted')}>{d.label}</span>
          </div>
        ))}
      </div>

      {series.length > 1 && (
        <figcaption className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5" aria-hidden="true">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-xs text-muted">
              <span className={cn('size-2.5 rounded-sm', s.color)} />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {series.map((s) => (
              <th key={s.id} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              {series.map((s) => (
                <td key={s.id}>{formatValue(d.values[s.id] || 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
