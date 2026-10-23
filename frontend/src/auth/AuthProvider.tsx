import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'

import { apiRequest } from '@/api/client'

import { authedRequest, readTokens, subscribe, writeTokens, type Tokens } from './session'

export interface User {
  id: number
  username: string
  email: string
}

interface AuthContextValue {
  user: User | null
  /** True while a stored session is being checked. */
  checking: boolean
  signIn: (username: string, password: string) => Promise<void>
  signUp: (username: string, email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function useHasSession(): boolean {
  return useSyncExternalStore(subscribe, () => readTokens() !== null, () => false)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const hasSession = useHasSession()

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => authedRequest<User>('GET', '/auth/users/me/'),
    enabled: hasSession,
    staleTime: Infinity,
    retry: false,
  })

  const signIn = useCallback(
    async (username: string, password: string) => {
      const tokens = await apiRequest<Tokens>('POST', '/auth/jwt/create/', { body: { username, password } })
      writeTokens(tokens)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    [queryClient],
  )

  const signUp = useCallback(
    async (username: string, email: string, password: string) => {
      await apiRequest('POST', '/auth/users/', { body: { username, email, password } })
      await signIn(username, password)
    },
    [signIn],
  )

  const signOut = useCallback(() => {
    writeTokens(null)
    queryClient.removeQueries({ queryKey: ['me'] })
    queryClient.removeQueries({ queryKey: ['my-shortlists'] })
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: hasSession ? (me.data ?? null) : null,
      checking: hasSession && me.isPending,
      signIn,
      signUp,
      signOut,
    }),
    [hasSession, me.data, me.isPending, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
