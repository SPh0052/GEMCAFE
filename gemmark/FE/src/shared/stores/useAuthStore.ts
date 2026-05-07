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

type AuthStateSlice = {
  isAuthenticated: boolean
  username: string | null
  accessToken: string | null
  refreshToken: string | null
  tokenType: string | null
  expiresIn: number | null
}

/** localStorage 에서 세션을 안전하게 읽어 store 슬라이스로 변환. */
const loadInitial = (): AuthStateSlice => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw) as AuthSession
      return { isAuthenticated: true, ...data }
    }
  } catch {
    // localStorage 접근 자체가 막혔거나 파싱 실패 — 비로그인 상태로 시작
  }
  return { ...emptyState }
}

/**
 * localStorage 쓰기 안전 래퍼.
 * 사파리 시크릿 모드 / 용량 초과 / 권한 거부 등 케이스에서 throw 가능.
 * 실패해도 메모리 store 는 정상 동작하므로 현재 탭은 유지.
 * 단점: 새로고침/재진입 시 세션 복원 불가 + 멀티 탭 동기화 안 됨.
 */
function safeWrite(value: AuthSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch (err) {
    console.warn(
      '[Auth] localStorage 쓰기 실패 — 이번 탭에서만 세션 유지됩니다.',
      err,
    )
  }
}

function safeRemove() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 무시 — 다음 페이지 이동 시 어차피 메모리 store 도 비워짐
  }
}

export const useAuthStore = create<AuthStore>((set) => {
  const initial = loadInitial()

  // ── 멀티 탭 동기화 ──
  // 다른 탭에서 같은 origin 의 localStorage 가 변경되면 'storage' 이벤트가 발생.
  // (자기 자신이 변경한 건 발화되지 않으므로 무한 루프 걱정 X)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return
      // newValue 가 null 이면 다른 탭에서 로그아웃한 것.
      if (e.newValue === null) {
        set({ ...emptyState })
        return
      }
      // 다른 탭에서 로그인/토큰 갱신했다면 그 값으로 동기화.
      try {
        const session = JSON.parse(e.newValue) as AuthSession
        set({ isAuthenticated: true, ...session })
      } catch {
        // 깨진 JSON 은 무시
      }
    })
  }

  return {
    ...initial,
    login: (session) => {
      safeWrite(session)
      set({ isAuthenticated: true, ...session })
    },
    logout: () => {
      safeRemove()
      set({ ...emptyState })
    },
  }
})
