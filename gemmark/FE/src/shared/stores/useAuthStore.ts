import { create } from 'zustand'

export interface AuthSession {
  username: string
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

interface AuthStore {
  isAuthenticated: boolean
  username: string | null
  accessToken: string | null
  refreshToken: string | null
  tokenType: string | null
  expiresIn: number | null
  login: (session: AuthSession) => void
  logout: () => void
}

const STORAGE_KEY = 'gemmark-auth'

const emptyState = {
  isAuthenticated: false,
  username: null,
  accessToken: null,
  refreshToken: null,
  tokenType: null,
  expiresIn: null,
} as const

const loadInitial = (): {
  isAuthenticated: boolean
  username: string | null
  accessToken: string | null
  refreshToken: string | null
  tokenType: string | null
  expiresIn: number | null
} => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as AuthSession
      return { isAuthenticated: true, ...data }
    }
  } catch {
    // ignore
  }
  return { ...emptyState }
}

export const useAuthStore = create<AuthStore>((set) => {
  const initial = loadInitial()
  return {
    ...initial,
    login: (session) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      set({ isAuthenticated: true, ...session })
    },
    logout: () => {
      localStorage.removeItem(STORAGE_KEY)
      set({ ...emptyState })
    },
  }
})
