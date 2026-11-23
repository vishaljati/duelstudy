import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input } from '../ui/Field'

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted transition hover:text-fg"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
