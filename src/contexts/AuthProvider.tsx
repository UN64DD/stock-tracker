import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type AuthUser,
} from '@/lib/api'
import { AuthContext, type AuthContextValue, type SignUpInput } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchCurrentUser())
    } catch {
      // Any failure (401, expired session, network) means "not signed in".
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchCurrentUser()
      .then((current) => {
        if (active) setUser(current)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    const next = await loginUser(email, password)
    setUser(next)
    return next
  }, [])

  const signUp = useCallback<AuthContextValue['signUp']>(async (input: SignUpInput) => {
    const next = await registerUser(input)
    setUser(next)
    return next
  }, [])

  const signOut = useCallback(async () => {
    try {
      await logoutUser()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
