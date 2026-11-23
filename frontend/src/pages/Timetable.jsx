import { Moon, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { ConfirmModal, Modal } from '../components/ui/Modal'
import { Chip, EmptyState, PageHeader } from '../components/ui/Misc'
import { useData } from '../context/DataContext'
import { SLOT_TYPES } from '../lib/constants'
import { formatClock, formatDuration, isOvernight, isWithinSlot, slotDuration, toMinutes } from '../lib/dates'
import { cn } from '../lib/utils'

const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function SlotModal({ slot, onClose }) {
  const { saveSlot } = useData()
  const [form, setForm] = useState(slot ?? { name: '', type: 'study', start: '09:00', end: '10:00' })
  const [error, setError] = useState('')
  const set = (f) => (e) => {
    setForm((s) => ({ ...s, [f]: e.target.value }))
    setError('')
  }
  const submit = (e) => {
    e.preventDefault()
    if (form.name.trim().length < 2) return setError('Give the block a name.')
    if (!form.start || !form.end || form.start === form.end) return setError('Start and end times must differ.')
    saveSlot({ ...form, name: form.name.trim() })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={slot ? 'Edit block' : 'New time block'}
      description="An end time earlier than the start runs past midnight."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="slot-form">
            Save
          </Button>
        </>
      }
    >
      <form id="slot-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Field label="Name">{(p) => <Input {...p} autoFocus maxLength={40} value={form.name} onChange={set('name')} placeholder="e.g. Study 1" />}</Field>
        <Field label="Type">
          {(p) => (
            <Select {...p} value={form.type} onChange={set('type')}>
              {SLOT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">{(p) => <Input {...p} type="time" value={form.start} onChange={set('start')} />}</Field>
          <Field label="End">{(p) => <Input {...p} type="time" value={form.end} onChange={set('end')} />}</Field>
        </div>
      </form>
    </Modal>
  )
}

export default function Timetable() {
  const { data, deleteSlot, resetSchedule } = useData()
  const [minutes, setMinutes] = useState(nowMinutes)
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    const id = setInterval(() => setMinutes(nowMinutes()), 30000)
    return () => clearInterval(id)
  }, [])

  const slots = [...data.schedule].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const studyMin = slots.filter((s) => s.type === 'study').reduce((sum, s) => sum + slotDuration(s.start, s.end), 0)

  return (
    <div>
      <PageHeader
        title="Daily Timetable"
        description={`${formatDuration(studyMin)} of study blocks scheduled each day.`}
        action={
          <>
            <Button variant="secondary" onClick={() => setConfirm('reset')}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
            <Button onClick={() => setEditing({ slot: null })}>
              <Plus className="size-4" aria-hidden="true" />
              Add block
            </Button>
          </>
        }
      />

      <ul className="mb-4 flex flex-wrap gap-2" aria-label="Legend">
        {SLOT_TYPES.map((t) => (
          <li key={t.id}>
            <Chip className={t.soft}>{t.label}</Chip>
          </li>
        ))}
      </ul>

      {slots.length === 0 ? (
        <EmptyState title="Your timetable is empty" description="Add blocks or reset to the default schedule." />
      ) : (
        <ol className="flex flex-col gap-2">
          {slots.map((s) => {
            const type = SLOT_TYPES.find((t) => t.id === s.type) ?? SLOT_TYPES[4]
            const active = isWithinSlot(s.start, s.end, minutes)
            return (
              <li
                key={s.id}
                aria-current={active ? 'time' : undefined}
                className={cn(
                  'group flex items-center gap-4 rounded-2xl border bg-surface p-3 pr-2 transition sm:p-4',
                  active ? 'border-accent/50 bg-accent/5 shadow-[0_0_0_1px_rgba(62,230,168,0.25)]' : 'border-border',
                )}
              >
                <div className="w-20 shrink-0 text-right sm:w-28">
                  <p className="text-sm font-semibold tabular-nums">{formatClock(s.start)}</p>
                  <p className="text-xs text-muted tabular-nums">{formatClock(s.end)}</p>
                </div>
                <span className={cn('h-10 w-1 shrink-0 rounded-full', type.className)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{s.name}</span>
                    {active && <Chip className="border-accent/30 bg-accent/15 text-accent">Now</Chip>}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    {type.label} · {formatDuration(slotDuration(s.start, s.end))}
                    {isOvernight(s.start, s.end) && (
                      <>
                        {' · '}
                        <Moon className="size-3" aria-hidden="true" /> overnight
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-1 sm:opacity-0 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <button type="button" onClick={() => setEditing({ slot: s })} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Edit ${s.name}`}>
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => setConfirm(s)} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${s.name}`}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {editing && <SlotModal key={editing.slot?.id ?? 'new'} slot={editing.slot} onClose={() => setEditing(null)} />}
      <ConfirmModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => (confirm === 'reset' ? resetSchedule() : deleteSlot(confirm.id))}
        title={confirm === 'reset' ? 'Reset timetable?' : 'Delete this block?'}
        description={confirm === 'reset' ? 'Your schedule will be replaced with the default timetable.' : confirm ? `“${confirm.name}” will be removed.` : ''}
        confirmLabel={confirm === 'reset' ? 'Reset' : 'Delete'}
      />
    </div>
  )
}
