import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { PRIORITIES } from '../../lib/constants'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'

const emptyTask = (date, subject) => ({ title: '', subject, date, time: '', durationMin: 60, priority: 'medium', notes: '' })

function validate(form) {
  const errors = {}
  if (form.title.trim().length < 2) errors.title = 'Give the task a short title.'
  if (!form.date) errors.date = 'Pick a date.'
  const d = Number(form.durationMin)
  if (!Number.isFinite(d) || d < 5 || d > 720) errors.durationMin = 'Duration must be between 5 and 720 minutes.'
  return errors
}

export function TaskFormModal({ open, onClose, task, defaultDate }) {
  const { goal, addTask, updateTask } = useData()
  const [form, setForm] = useState(() => (task ? { ...task } : emptyTask(defaultDate, goal.subjects[0])))
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const found = validate(form)
    if (Object.keys(found).length) return setErrors(found)
    const payload = {
      title: form.title.trim(),
      subject: form.subject,
      date: form.date,
      time: form.time,
      durationMin: Math.round(Number(form.durationMin)),
      priority: form.priority,
      notes: form.notes.trim(),
    }
    if (task) updateTask(task.id, payload)
    else addTask(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New study task'}
      description="Completed tasks count toward your study hours."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="task-form">
            {task ? 'Save changes' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Title" error={errors.title}>
          {(p) => <Input {...p} autoFocus placeholder="e.g. Rotational motion — PYQs" value={form.title} onChange={set('title')} maxLength={80} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject">
            {(p) => (
              <Select {...p} value={form.subject} onChange={set('subject')}>
                {goal.subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Priority">
            {(p) => (
              <Select {...p} value={form.priority} onChange={set('priority')}>
                {PRIORITIES.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Date" error={errors.date} className="col-span-2 sm:col-span-1">
            {(p) => <Input {...p} type="date" value={form.date} onChange={set('date')} />}
          </Field>
          <Field label="Time (optional)">
            {(p) => <Input {...p} type="time" value={form.time} onChange={set('time')} />}
          </Field>
          <Field label="Minutes" error={errors.durationMin}>
            {(p) => <Input {...p} type="number" inputMode="numeric" min={5} max={720} step={5} value={form.durationMin} onChange={set('durationMin')} />}
          </Field>
        </div>
        <Field label="Notes (optional)">
          {(p) => (
            <textarea
              {...p}
              rows={2}
              maxLength={240}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Chapters, resources, goals…"
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-fg placeholder:text-muted/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}
