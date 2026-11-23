import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

export function Modal({ open, onClose, title, description, children, footer }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const target = panelRef.current?.querySelector('[data-autofocus], input, select, textarea') ?? panelRef.current
    target?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full animate-rise flex-col rounded-t-3xl border border-border bg-surface shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={tone}
            data-autofocus
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
