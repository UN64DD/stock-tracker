import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ChartLine, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { isApiError } from '@/lib/api'

type Mode = 'signin' | 'signup'

function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}

export function LoginPage() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/watchlist'

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'signup') {
        await signUp({ email, password, displayName: displayName.trim() || undefined })
      } else {
        await signIn(email, password)
      }
      navigate(from, { replace: true })
    } catch (submitError) {
      setError(errorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ChartLine className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold text-foreground">Stock Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to keep your watchlist synced to your account.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-3">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(['signin', 'signup'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setMode(option)
                    setError(null)
                  }}
                  aria-pressed={mode === option}
                  className={
                    mode === option
                      ? 'rounded-md bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm'
                      : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'
                  }
                >
                  {option === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
            <CardTitle className="text-base">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === 'signup' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Name (optional)</Label>
                  <Input
                    id="displayName"
                    autoComplete="name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                />
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Demo accounts are stored in a local SQLite database on the API server.
          Do not reuse a real password.
        </p>
      </div>
    </div>
  )
}
