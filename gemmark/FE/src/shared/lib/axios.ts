import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://k14s307.p.ssafy.io/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000, // 30초
})

/**
 * BE 호스트 (scheme + hostname + port). 정적 파일(/files/...) URL 조립에 사용.
 * 예: 'https://k14s307.p.ssafy.io/api/v1' → 'https://k14s307.p.ssafy.io'
 */
export const API_HOST = new URL(API_BASE_URL).origin

/**
 * BE가 내려준 상대 경로 URL을 절대 URL로 변환.
 * - null/undefined/빈 문자열 → undefined
 * - 'http://' 또는 'https://'로 시작 → 이미 절대 URL이라 그대로 반환
 * - 그 외 (예: '/files/watermarked/abc.jpg') → API_HOST prefix 부착
 *
 * 배포에선 같은 도메인이라 nginx 프록시로 우연히 작동하지만, 로컬 dev 에선
 * FE origin(localhost:5173) 으로 요청 가서 404. 이 헬퍼로 명시적 절대화.
 */
export function resolveFileUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//.test(path)) return path
  return `${API_HOST}${path}`
}

const STORAGE_KEY = 'gemmark-auth'

interface StoredSession {
  username?: string
  accessToken?: string
  refreshToken?: string
  tokenType?: string
  expiresIn?: number
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

function clearSessionAndRedirect() {
  localStorage.removeItem(STORAGE_KEY)
  // 풀 리로드로 React 앱·Zustand 스토어 모두 깨끗하게 초기화하면서 /login 으로.
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

// ───── 요청 인터셉터: accessToken 자동 첨부 ─────
// 모든 요청에 로그인 시 받은 accessToken을 authorization 헤더로 자동 첨부.
// (Swagger 스펙에 헤더 이름이 'authorization' 소문자로 표기돼 있어 그대로 맞춤.
//  HTTP 헤더는 case-insensitive라 대문자여도 동작은 같지만 Network 탭에서
//  눈으로 비교하기 쉽도록 통일.)
// 로그인 자체(/auth/login) 호출 시점에는 토큰이 아직 없으므로 그대로 통과.
api.interceptors.request.use((config) => {
  const session = readSession()
  if (session?.accessToken) {
    config.headers.authorization = `${session.tokenType ?? 'Bearer'} ${session.accessToken}`
  }
  return config
})

// ───── 응답 인터셉터: 401 → 토큰 갱신 → 원 요청 재시도 ─────
//
// 동시 다발 401 처리:
//   - 첫 401 만 실제 refresh 호출
//   - 그 사이 발생한 다른 401 들은 pendingQueue 에 적재
//   - refresh 완료되면 큐에 있던 요청들 모두 새 토큰으로 재발사
//   - refresh 실패 시 큐 전부 reject + 강제 로그아웃 + /login 이동

let isRefreshing = false
type PendingResolver = (newToken: string | null) => void
const pendingQueue: PendingResolver[] = []

function notifyAll(token: string | null) {
  while (pendingQueue.length > 0) {
    const cb = pendingQueue.shift()
    cb?.(token)
  }
}

async function tryRefreshToken(): Promise<string | null> {
  const session = readSession()
  if (!session?.refreshToken) return null

  try {
    // axios 인스턴스(api) 가 아닌 raw axios 사용: 인터셉터 재진입 방지.
    const baseURL = api.defaults.baseURL ?? ''
    const res = await axios.post(`${baseURL}/auth/refresh`, {
      refreshToken: session.refreshToken,
    })
    const data = (res.data?.data ?? res.data) as StoredSession
    if (!data?.accessToken) return null

    // 갱신된 토큰으로 localStorage 업데이트 (refreshToken 도 새로 받았다면 그 값 사용)
    const updated: StoredSession = {
      ...session,
      ...data,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return data.accessToken
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined
    const status = error.response?.status

    if (!originalRequest || status !== 401) {
      return Promise.reject(error)
    }

    // 무한 루프 방지: 한 번 재시도한 요청은 더 이상 재시도하지 않음
    if (originalRequest._retry) {
      clearSessionAndRedirect()
      return Promise.reject(error)
    }

    // 인증 자체 호출(/auth/login, /auth/refresh)이 401 이면 갱신 시도 무의미
    const url = (originalRequest.url ?? '').toString()
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    // 이미 다른 요청이 refresh 중이면 큐에 적재 후 결과 받아 재시도
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push((newToken) => {
          if (!newToken) {
            reject(error)
            return
          }
          if (!originalRequest.headers) originalRequest.headers = {}
          ;(originalRequest.headers as Record<string, string>).authorization =
            `Bearer ${newToken}`
          resolve(api(originalRequest))
        })
      })
    }

    isRefreshing = true
    try {
      const newToken = await tryRefreshToken()
      if (!newToken) {
        notifyAll(null)
        clearSessionAndRedirect()
        return Promise.reject(error)
      }

      notifyAll(newToken)
      if (!originalRequest.headers) originalRequest.headers = {}
      ;(originalRequest.headers as Record<string, string>).authorization =
        `Bearer ${newToken}`
      return api(originalRequest)
    } finally {
      isRefreshing = false
    }
  },
)
