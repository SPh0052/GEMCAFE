import { create } from 'zustand'

export interface User {
  /** 사용자 고유 ID. 구글 OAuth 의 sub 또는 BE 가 발급한 userId 문자열. */
  sub: string
  nickname: string
  email: string
  /** 회원가입 시 입력한 전화번호. 미완료 사용자는 undefined */
  phone?: string
  picture?: string
  gem: number
}

export interface AuthTokens {
  accessToken: string
  tokenType: string
  expiresIn: number
}

interface AuthStore {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  login: (user: User, tokens?: AuthTokens) => void
  logout: () => void
  /** 로그인 후 /users/me 응답으로 사용자 정보를 갱신할 때 사용. */
  setUser: (user: User) => void
  setPhone: (phone: string) => void
  chargeGem: (amount: number) => void
}

const STORAGE_KEY = 'gemcafe-auth'

interface PersistedSession {
  user: User
  tokens?: AuthTokens
}

const loadSession = (): PersistedSession | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSession
  } catch {
    return null
  }
}

const persist = (session: PersistedSession | null) => {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 시크릿 모드 등에서 throw 가능 — 메모리 store 만 동작
  }
}

const initial = loadSession()

export const useAuthStore = create<AuthStore>((set) => ({
  user: initial?.user ?? null,
  tokens: initial?.tokens ?? null,
  isAuthenticated: !!initial?.user,
  login: (user, tokens) => {
    const next: PersistedSession = { user, tokens }
    persist(next)
    set({ user, tokens: tokens ?? null, isAuthenticated: true })
  },
  logout: () => {
    persist(null)
    set({ user: null, tokens: null, isAuthenticated: false })
  },
  setUser: (user) =>
    set((state) => {
      persist({ user, tokens: state.tokens ?? undefined })
      return { user, isAuthenticated: true }
    }),
  setPhone: (phone) =>
    set((state) => {
      if (!state.user) return state
      const updated = { ...state.user, phone }
      persist({ user: updated, tokens: state.tokens ?? undefined })
      return { user: updated }
    }),
  chargeGem: (amount) =>
    set((state) => {
      if (!state.user) return state
      const updated = { ...state.user, gem: state.user.gem + amount }
      persist({ user: updated, tokens: state.tokens ?? undefined })
      return { user: updated }
    }),
}))
