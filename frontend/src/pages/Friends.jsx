
import {
  Check,
  Copy,
  Inbox,
  Send,
  Swords,
  UserMinus,
  X,
  RefreshCw,
  Search,
  UserPlus,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, Input } from '../components/ui/Field'
import { ConfirmModal } from '../components/ui/Modal'
import { Avatar, Chip, PageHeader } from '../components/ui/Misc'

import { useData } from '../context/DataContext'
import { timeAgo } from '../lib/dates'
import { copyToClipboard } from '../lib/utils'

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getRequestId = (request) =>
  request._id || request.id

const getUserId = (person) =>
  typeof person === 'object'
    ? person?._id || person?.id
    : person

const getRequestPerson = (request, direction, currentUserId) => {
  if (direction === 'incoming') {
    return (
      request.from ||
      request.sender ||
      request.requester ||
      request.requestedBy ||
      null
    )
  }

  const directPerson =
    request.to ||
    request.receiver ||
    null

  if (directPerson) return directPerson

  const userA = request.userA
  const userB = request.userB

  const userAId = getUserId(userA)
  const userBId = getUserId(userB)

  if (userAId === currentUserId) {
    return typeof userB === 'object' ? userB : null
  }

  if (userBId === currentUserId) {
    return typeof userA === 'object' ? userA : null
  }

  return null
}

// --------------------------------------------------
// Copy Button
// --------------------------------------------------

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return

    const success = await copyToClipboard(text)

    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      disabled={!text}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}

      <span aria-live="polite">
        {copied ? 'Copied' : label}
      </span>
    </Button>
  )
}

// --------------------------------------------------
// User Search
// --------------------------------------------------

function UserSearch() {
  const {
    searchUsers,
    sendFriendRequestToUser,
    friend,
  } = useData()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Debounced search.
  useEffect(() => {
    const searchQuery = query.trim()

    if (searchQuery.length < 2) {
      setResults([])
      setLoading(false)
      setError('')
      return
    }

    let cancelled = false

    setLoading(false)
    setError('')
    setResults([])

    const timer = setTimeout(async () => {
      if (cancelled) return

      setLoading(true)

      try {
        const response = await searchUsers(searchQuery)

        if (!cancelled) {
          setResults(
            Array.isArray(response) ? response : [],
          )
        }
      } catch (err) {
        if (!cancelled) {
          setResults([])
          setError(
            err.response?.data?.message ||
            'Unable to search users.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, searchUsers])

  // Send request to selected user.
  const handleSendRequest = async (targetUserId) => {
    if (!targetUserId || sendingId || friend) return

    setSendingId(targetUserId)
    setError('')
    setSuccess('')

    const result = await sendFriendRequestToUser(targetUserId)

    if (result.ok) {
      setResults((previous) =>
        previous.map((person) =>
          person._id === targetUserId
            ? {
                ...person,
                relationshipStatus: 'outgoing',
              }
            : person,
        ),
      )

      setSuccess('Friend request sent successfully.')
    } else {
      setError(result.error || 'Unable to send friend request.')
    }

    setSendingId(null)
  }

  const getRelationshipLabel = (status) => {
    switch (status) {
      case 'friends':
        return 'Already friends'

      case 'outgoing':
        return 'Request sent'

      case 'incoming':
        return 'Request received'

      default:
        return 'Add friend'
    }
  }

  const isUnavailable = (status) =>
    status === 'friends' ||
    status === 'outgoing' ||
    status === 'incoming'

  return (
    <Card>
      <CardHeader
        title="Find a study partner"
        description="Search for students by name and send them a friend request."
      />

      <div className="flex flex-col gap-4">
        <Field label="Search by name">
          {(props) => (
            <Input
              {...props}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSuccess('')
                setError('')
              }}
              placeholder="Enter a student's name..."
              autoComplete="off"
            />
          )}
        </Field>

        {query.trim().length < 2 && (
          <p className="text-xs text-muted">
            Enter at least 2 characters to search.
          </p>
        )}

        {loading && (
          <div
            className="flex items-center gap-2 text-sm text-muted"
            role="status"
          >
            <RefreshCw className="size-4 animate-spin" />
            Searching students...
          </div>
        )}

        {error && (
          <p
            className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-accent"
            role="status"
          >
            {success}
          </p>
        )}

        {!loading &&
          !error &&
          query.trim().length >= 2 &&
          results.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <Search className="mx-auto mb-2 size-5 text-muted" />

              <p className="text-sm font-medium">
                No students found
              </p>

              <p className="mt-1 text-xs text-muted">
                Try searching with another name.
              </p>
            </div>
          )}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Search results
            </p>

            {results.map((person) => {
              const status =
                person.relationshipStatus || 'none'

              const unavailable =
                Boolean(friend) || isUnavailable(status)

              const isSending =
                sendingId === person._id

              return (
                <div
                  key={person._id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <Avatar
                    name={person.name || '?'}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {person.name}
                    </p>

                    <p className="text-xs text-muted">
                      {person.goal || 'Student'}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={unavailable ? 'secondary' : 'primary'}
                    disabled={
                      unavailable ||
                      Boolean(sendingId)
                    }
                    onClick={() =>
                      handleSendRequest(person._id)
                    }
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="size-3.5 animate-spin" />
                        Sending
                      </>
                    ) : status === 'none' && !friend ? (
                      <>
                        <UserPlus className="size-3.5" />
                        Add
                      </>
                    ) : friend ? (
                      'Partner assigned'
                    ) : (
                      getRelationshipLabel(status)
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {friend && (
          <p className="text-xs text-muted">
            You already have a study partner. Remove your current partner before adding someone else.
          </p>
        )}
      </div>
    </Card>
  )
}

// --------------------------------------------------
// Invite Form
// --------------------------------------------------

function InviteForm() {
  const {
    sendInvite,
    friend,
    outgoingRequests,
  } = useData()

  const [code, setCode] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()

    if (loading || !code.trim()) return

    setLoading(true)
    setStatus(null)

    try {
      const result = await sendInvite(code)

      if (!result.ok) {
        setStatus({
          ok: false,
          text: result.error,
        })

        return
      }

      setStatus({
        ok: true,
        text: `Invitation sent to ${result.name}.`,
      })

      setCode('')
    } catch (error) {
      setStatus({
        ok: false,
        text:
          error.message ||
          'Unable to send invitation.',
      })
    } finally {
      setLoading(false)
    }
  }

  const hasOutgoingRequest = outgoingRequests.length > 0

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-3"
    >
      <Field
        label="Friend’s invite code"
        error={
          status && !status.ok
            ? status.text
            : undefined
        }
      >
        {(props) => (
          <Input
            {...props}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setStatus(null)
            }}
            placeholder="DUEL-88E7398C"
            className="font-mono uppercase tracking-wider"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={Boolean(friend) || loading}
          />
        )}
      </Field>

      {status?.ok && (
        <p
          role="status"
          className="text-sm text-accent"
        >
          {status.text}
        </p>
      )}

      <Button
        type="submit"
        disabled={
          !code.trim() ||
          Boolean(friend) ||
          loading
        }
      >
        <Send className="size-4" aria-hidden="true" />

        {loading ? 'Sending...' : 'Send invitation'}
      </Button>

      {friend && (
        <p className="text-xs text-muted">
          You already have a study partner. Remove them
          to invite someone else.
        </p>
      )}

      {!friend && hasOutgoingRequest && (
        <p className="text-xs text-muted">
          You already have a pending invitation. Check
          your outgoing requests below.
        </p>
      )}
    </form>
  )
}

// --------------------------------------------------
// Incoming Request Item
// --------------------------------------------------

function IncomingRequestItem({
  request,
  currentUserId,
  onRespond,
  busy,
}) {
  const sender = getRequestPerson(
    request,
    'incoming',
    currentUserId,
  )

  const requestId = getRequestId(request)

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border p-3">
      <Avatar
        name={sender?.name ?? '?'}
        size="sm"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {sender?.name ?? 'Unknown user'} wants to duel
        </p>

        <p className="text-xs text-muted">
          {request.createdAt
            ? timeAgo(request.createdAt)
            : 'Recently'}
        </p>
      </div>

      <Button
        size="sm"
        onClick={() => onRespond(requestId, 'accepted')}
        disabled={busy}
      >
        <Check className="size-3.5" aria-hidden="true" />
        Accept
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRespond(requestId, 'rejected')}
        disabled={busy}
        aria-label="Decline invitation"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </li>
  )
}

// --------------------------------------------------
// Outgoing Request Item
// --------------------------------------------------

function OutgoingRequestItem({
  request,
  currentUserId,
  onCancel,
  busy,
}) {
  const receiver = getRequestPerson(
    request,
    'outgoing',
    currentUserId,
  )

  const requestId = getRequestId(request)

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border p-3">
      <Avatar
        name={receiver?.name ?? '?'}
        size="sm"
        className="bg-info/15 text-info ring-info/25"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          Sent to {receiver?.name ?? 'Unknown user'}
        </p>

        <p className="text-xs text-muted">
          Waiting ·{' '}
          {request.createdAt
            ? timeAgo(request.createdAt)
            : 'Recently'}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCancel(requestId)}
        disabled={busy}
      >
        Cancel
      </Button>
    </li>
  )
}

// --------------------------------------------------
// Main Friends Page
// --------------------------------------------------

export default function Friends() {
  const {
    user,
    friend,
    incomingRequests,
    outgoingRequests,
    friendsLoading,
    friendsError,
    refreshFriendsData,
    respondInvite,
    cancelInvite,
    removeFriend,
  } = useData()

  const [confirmRemove, setConfirmRemove] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [removingFriend, setRemovingFriend] = useState(false)

  const pendingCount =
    incomingRequests.length + outgoingRequests.length

  // --------------------------------------------------
  // Accept / Reject invitation
  // --------------------------------------------------

  const handleRespond = async (requestId, status) => {
    if (!requestId || busyId) return

    setBusyId(requestId)
    setActionError('')

    try {
      const result = await respondInvite(requestId, status)

      if (!result?.ok) {
        setActionError(
          result?.error || 'Unable to update invitation.',
        )
      }
    } catch (error) {
      setActionError(
        error.message || 'Unable to update invitation.',
      )
    } finally {
      setBusyId(null)
    }
  }

  // --------------------------------------------------
  // Cancel outgoing invitation
  // --------------------------------------------------

  const handleCancel = async (requestId) => {
    if (!requestId || busyId) return

    setBusyId(requestId)
    setActionError('')

    try {
      const result = await cancelInvite(requestId)

      if (!result?.ok) {
        setActionError(
          result?.error || 'Unable to cancel invitation.',
        )
      }
    } catch (error) {
      setActionError(
        error.message || 'Unable to cancel invitation.',
      )
    } finally {
      setBusyId(null)
    }
  }

  // --------------------------------------------------
  // Remove friend
  // --------------------------------------------------

  const handleRemoveFriend = async () => {
    setRemovingFriend(true)
    setActionError('')

    try {
      const result = await removeFriend()

      if (!result?.ok) {
        setActionError(
          result?.error || 'Unable to remove study partner.',
        )
        return
      }

      setConfirmRemove(false)
    } catch (error) {
      setActionError(
        error.message || 'Unable to remove study partner.',
      )
    } finally {
      setRemovingFriend(false)
    }
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Friends"
        description="Pair up with one study partner and compete every week."
      />

      {/* Loading and error states */}

      {friendsLoading && (
        <div
          className="flex items-center gap-2 text-sm text-muted"
          role="status"
        >
          <RefreshCw className="size-4 animate-spin" />
          Loading friends data...
        </div>
      )}

      {(friendsError || actionError) && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {actionError || friendsError}
        </div>
      )}

      {friendsError && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refreshFriendsData().catch(() => {})}
          disabled={friendsLoading}
        >
          <RefreshCw className="size-4" />
          Retry
        </Button>
      )}

      {/* Current study partner */}

      {friend && (
        <Card className="border-accent/30 bg-gradient-to-br from-accent/10 to-surface">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              name={friend.name}
              size="lg"
              className="bg-info/15 text-info ring-info/25"
            />

            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-muted">
                Study partner
              </p>

              <p className="text-xl font-semibold">
                {friend.name}
              </p>

              <div className="mt-1 flex gap-2">
                {friend.goal && (
                  <Chip>{friend.goal}</Chip>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button as={Link} to="/competition">
                <Swords
                  className="size-4"
                  aria-hidden="true"
                />
                Compete
              </Button>

              <Button
                variant="danger"
                onClick={() => setConfirmRemove(true)}
              >
                <UserMinus
                  className="size-4"
                  aria-hidden="true"
                />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search by name */}

      <UserSearch />

      {/* Invite code and invitations */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invite code */}

        <Card>
          <CardHeader
            title="Your invite code"
            description="Share this with a friend so they can invite you."
          />

          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3">
            <span className="font-mono text-lg font-semibold tracking-widest text-accent">
              {user?.inviteCode || 'Unavailable'}
            </span>

            <CopyButton text={user?.inviteCode} />
          </div>

          <div className="mt-6">
            <InviteForm />
          </div>
        </Card>

        {/* Invitations */}

        <Card>
          <CardHeader
            icon={Inbox}
            title="Invitations"
            description={
              pendingCount
                ? `${pendingCount} pending`
                : 'No pending invitations'
            }
          />

          {friendsLoading ? (
            <p className="text-sm text-muted">
              Loading invitations...
            </p>
          ) : pendingCount === 0 ? (
            <p className="text-sm text-muted">
              Invitations you send or receive appear here.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Incoming requests */}

              {incomingRequests.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Received
                  </h3>

                  <ul className="flex flex-col gap-3">
                    {incomingRequests.map((request) => {
                      const id = getRequestId(request)

                      return (
                        <IncomingRequestItem
                          key={id}
                          request={request}
                          currentUserId={user?.id}
                          onRespond={handleRespond}
                          busy={busyId === id}
                        />
                      )
                    })}
                  </ul>
                </section>
              )}

              {/* Outgoing requests */}

              {outgoingRequests.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Sent
                  </h3>

                  <ul className="flex flex-col gap-3">
                    {outgoingRequests.map((request) => {
                      const id = getRequestId(request)

                      return (
                        <OutgoingRequestItem
                          key={id}
                          request={request}
                          currentUserId={user?.id}
                          onCancel={handleCancel}
                          busy={busyId === id}
                        />
                      )
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Remove confirmation */}

      <ConfirmModal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemoveFriend}
        title="Remove study partner?"
        description={
          friend
            ? `You and ${friend.name} will stop competing. You can invite someone new afterwards.`
            : ''
        }
        confirmLabel={
          removingFriend ? 'Removing...' : 'Remove'
        }
      />
    </div>
  )
}
