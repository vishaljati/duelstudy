import { Check, Copy, FlaskConical, Inbox, Send, Swords, Trash2, UserMinus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Field'
import { ConfirmModal } from '../components/ui/Modal'
import { Avatar, Chip, PageHeader } from '../components/ui/Misc'
import { useData } from '../context/DataContext'
import { GOALS } from '../lib/constants'
import { timeAgo } from '../lib/dates'
import { copyToClipboard } from '../lib/utils'

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        if (await copyToClipboard(text)) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }
      }}
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  )
}

function InviteForm() {
  const { sendInvite, friend } = useData()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState(null)
  const submit = (e) => {
    e.preventDefault()
    const res = sendInvite(code)
    setStatus(res.ok ? { ok: true, text: `Invitation sent to ${res.name}.` } : { ok: false, text: res.error })
    if (res.ok) setCode('')
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Field label="Friend’s invite code" error={status && !status.ok ? status.text : undefined}>
        {(p) => (
          <Input
            {...p}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setStatus(null)
            }}
            placeholder="DUEL-AB12CD"
            className="font-mono uppercase tracking-wider"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={Boolean(friend)}
          />
        )}
      </Field>
      {status?.ok && (
        <p role="status" className="text-sm text-accent">
          {status.text}
        </p>
      )}
      <Button type="submit" disabled={!code.trim() || Boolean(friend)}>
        <Send className="size-4" aria-hidden="true" />
        Send invitation
      </Button>
      {friend && <p className="text-xs text-muted">You already have a study partner. Remove them to invite someone else.</p>}
    </form>
  )
}

function SimulatedProfiles() {
  const { user, simulatedProfiles, createSimulatedProfile, deleteSimulatedProfile } = useData()
  const [form, setForm] = useState({ name: '', goal: user.goal })
  const [error, setError] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const res = createSimulatedProfile(form)
    if (!res.ok) return setError(res.error)
    setForm({ name: '', goal: user.goal })
  }
  return (
    <Card>
      <CardHeader icon={FlaskConical} title="Demo study partners" description="Create local test profiles with sample activity, then invite them by code." />
      <form onSubmit={submit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Name" error={error} className="flex-1">
          {(p) => <Input {...p} value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setError('') }} placeholder="e.g. Riya" maxLength={30} />}
        </Field>
        <Field label="Goal" className="sm:w-32">
          {(p) => (
            <Select {...p} value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}>
              {Object.keys(GOALS).map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" variant="secondary">
          Create
        </Button>
      </form>
      {simulatedProfiles.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {simulatedProfiles.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <Avatar name={p.name} size="sm" className="bg-info/15 text-info ring-info/25" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="font-mono text-xs text-muted">{p.inviteCode}</p>
              </div>
              <CopyButton text={p.inviteCode} label="Code" />
              <Button variant="ghost" size="icon" onClick={() => deleteSimulatedProfile(p.id)} aria-label={`Delete ${p.name}`}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function Friends() {
  const { user, invites, userById, respondInvite, friend, removeFriend } = useData()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const pending = invites.filter((i) => i.status === 'pending')
  const incoming = pending.filter((i) => i.toId === user.id)
  const outgoing = pending.filter((i) => i.fromId === user.id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Friends" description="Pair up with one study partner and compete every week." />
      <p className="-mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted text-pretty">
        Friends are simulated locally: invites work between accounts created in this browser. Sign up a second account in another
        browser profile on this device — or create a demo partner below — to try it.
      </p>

      {friend && (
        <Card className="border-accent/30 bg-gradient-to-br from-accent/10 to-surface">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={friend.name} size="lg" className="bg-info/15 text-info ring-info/25" />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-muted">Study partner</p>
              <p className="text-xl font-semibold">{friend.name}</p>
              <div className="mt-1 flex gap-2">
                <Chip>{friend.goal}</Chip>
                {friend.simulated && <Chip>Demo</Chip>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button as={Link} to="/competition">
                <Swords className="size-4" aria-hidden="true" />
                Compete
              </Button>
              <Button variant="danger" onClick={() => setConfirmRemove(true)}>
                <UserMinus className="size-4" aria-hidden="true" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your invite code" description="Share this with a friend so they can invite you." />
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3">
            <span className="font-mono text-lg font-semibold tracking-widest text-accent">{user.inviteCode}</span>
            <CopyButton text={user.inviteCode} />
          </div>
          <div className="mt-6">
            <InviteForm />
          </div>
        </Card>

        <Card>
          <CardHeader icon={Inbox} title="Invitations" description={pending.length ? `${pending.length} pending` : 'No pending invitations'} />
          {pending.length === 0 ? (
            <p className="text-sm text-muted">Invitations you send or receive appear here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {incoming.map((i) => {
                const from = userById(i.fromId)
                return (
                  <li key={i.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <Avatar name={from?.name ?? '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{from?.name ?? 'Unknown'} wants to duel</p>
                      <p className="text-xs text-muted">{timeAgo(i.createdAt)}</p>
                    </div>
                    <Button size="sm" onClick={() => respondInvite(i.id, 'accepted')}>
                      <Check className="size-3.5" aria-hidden="true" />
                      Accept
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => respondInvite(i.id, 'declined')} aria-label="Decline invitation">
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                )
              })}
              {outgoing.map((i) => {
                const to = userById(i.toId)
                const isDemo = to?.simulated && to.createdBy === user.id
                return (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                    <Avatar name={to?.name ?? '?'} size="sm" className="bg-info/15 text-info ring-info/25" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">Sent to {to?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted">Waiting · {timeAgo(i.createdAt)}</p>
                    </div>
                    {isDemo && (
                      <Button size="sm" variant="secondary" onClick={() => respondInvite(i.id, 'accepted')}>
                        Accept as {to.name.split(' ')[0]}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => respondInvite(i.id, 'declined')}>
                      Cancel
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <SimulatedProfiles />

      <ConfirmModal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={removeFriend}
        title="Remove study partner?"
        description={friend ? `You and ${friend.name} will stop competing. You can invite someone new afterwards.` : ''}
        confirmLabel="Remove"
      />
    </div>
  )
}
