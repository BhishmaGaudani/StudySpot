// Login state for the whole app.
//
// The JWT from the server is saved in localStorage so you stay logged in after
// a refresh. On startup we call /auth/me to check the saved token still works
// (it may have expired). Logging out just deletes the token; the server keeps
// no session to end.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from './lib/api'
import type { AuthResponse, User } from './types'

interface AuthState {
  user: User | null
  loading: boolean // true while checking a saved token on startup
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => tokenStore.get() !== null)

  useEffect(() => {
    if (!tokenStore.get()) return
    api
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const handleAuth = (res: AuthResponse) => {
    tokenStore.set(res.access_token)
    setUser(res.user)
  }

  const value: AuthState = {
    user,
    loading,
    login: async (email, password) => handleAuth(await api.login(email, password)),
    signup: async (name, email, password) => handleAuth(await api.signup(name, email, password)),
    logout: () => {
      tokenStore.clear()
      setUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
