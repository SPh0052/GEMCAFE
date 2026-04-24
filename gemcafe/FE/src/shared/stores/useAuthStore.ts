import { create } from 'zustand'

interface User {
  nickname: string
  email: string
  gem: number
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  chargeGem: (amount: number) => void
}

const STORAGE_KEY = 'gemcafe-user'

const loadUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: loadUser(),
  isAuthenticated: loadUser() !== null,
  login: (user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ user: null, isAuthenticated: false })
  },
  chargeGem: (amount) =>
    set((state) => {
      if (!state.user) return state
      const updated = { ...state.user, gem: state.user.gem + amount }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return { user: updated }
    }),
}))
