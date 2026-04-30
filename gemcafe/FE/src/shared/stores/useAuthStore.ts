import { create } from 'zustand'

export interface User {
  /** 구글 sub (사용자 고유 ID). BE 붙기 전엔 이게 식별자. */
  sub: string
  nickname: string
  email: string
  /** 회원가입 시 입력한 전화번호. 미완료 사용자는 undefined */
  phone?: string
  picture?: string
  gem: number
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  setPhone: (phone: string) => void
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

const persist = (user: User | null) => {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY)
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: loadUser(),
  isAuthenticated: loadUser() !== null,
  login: (user) => {
    persist(user)
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    persist(null)
    set({ user: null, isAuthenticated: false })
  },
  setPhone: (phone) =>
    set((state) => {
      if (!state.user) return state
      const updated = { ...state.user, phone }
      persist(updated)
      return { user: updated }
    }),
  chargeGem: (amount) =>
    set((state) => {
      if (!state.user) return state
      const updated = { ...state.user, gem: state.user.gem + amount }
      persist(updated)
      return { user: updated }
    }),
}))
