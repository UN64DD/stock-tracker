import { createContext, useContext } from 'react'
import type { AuthUser } from '@/lib/api'

export interface SignUpInput {
  email: string
  password: string
  displayName?: string
}

export interface AuthContextValue {
  user: AuthUser | null
  /** True while the initial session lookup is in flight. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthUser>
  signUp: (input: SignUpInput) => Promise<AuthUser>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
