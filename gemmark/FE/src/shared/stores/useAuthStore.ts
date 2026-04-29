import { create } from 'zustand'

interface AuthStore {
  isAuthenticated: boolean
  username: string | null
  login: (username: string) => void
  logout: () => void
}

const STORAGE_KEY = 'gemmark-auth'

const loadInitial = (): { isAuthenticated: boolean; username: string | null } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as { username: string }
      return { isAuthenticated: true, username: data.username }
    }
  } catch {
    // ignore
  }
  return { isAuthenticated: false, username: null }
}

export const useAuthStore = create<AuthStore>((set) => {
  const initial = loadInitial()
  return {
    ...initial,
    login: (username) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ username }))
      set({ isAuthenticated: true, username })
    },
    logout: () => {
      localStorage.removeItem(STORAGE_KEY)
      set({ isAuthenticated: false, username: null })
    },
  }
})
