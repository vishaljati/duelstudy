import { Link } from 'react-router'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Misc'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <p className="font-display text-6xl font-bold text-accent">404</p>
      <h1 className="text-xl font-semibold">This page skipped class.</h1>
      <p className="max-w-sm text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button as={Link} to="/">
        Back to home
      </Button>
    </main>
  )
}
