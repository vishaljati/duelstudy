import { Clock, Pencil, Trash2 } from 'lucide-react'
import { PRIORITIES } from '../../lib/constants'
import { formatClock, formatDuration } from '../../lib/dates'
import { cn } from '../../lib/utils'
import { Chip } from '../ui/Misc'
import { TaskCheckbox } from './TaskCheckbox'

export function TaskItem({ task, onToggle, onEdit, onDelete }) {
  const priority = PRIORITIES.find((p) => p.id === task.priority) ?? PRIORITIES[1]
  return (
    <li className={cn('group flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition', task.completed && 'opacity-70')}>
      <div className="pt-0.5">
        <TaskCheckbox checked={task.completed} onChange={onToggle} label={task.title} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium text-pretty', task.completed && 'text-muted line-through')}>{task.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip>{task.subject}</Chip>
          <Chip className={priority.className}>{priority.label}</Chip>
          <Chip>
            <Clock className="size-3" aria-hidden="true" />
            {task.time ? `${formatClock(task.time)} · ` : ''}
            {formatDuration(task.durationMin)}
          </Chip>
        </div>
        {task.notes && <p className="mt-2 text-sm text-muted text-pretty">{task.notes}</p>}
      </div>
      <div className="flex gap-1 sm:opacity-0 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <button type="button" onClick={onEdit} className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-fg" aria-label={`Edit “${task.title}”`}>
          <Pencil className="size-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger" aria-label={`Delete “${task.title}”`}>
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}
