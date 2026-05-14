import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

// 상대 경로 사용:
//  · dev:  vite.config 의 server.proxy 가 /dev/be → BE 로 포워딩 (CORS 회피)
//  · prod: FE/BE 같은 도메인이라 그대로 fetch 가능
// 외부에서 fully-qualified URL 로 부르고 싶으면 .env 의 VITE_API_BASE_URL 로 오버라이드.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? '/dev/be/gemcafe/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  // refreshToken 은 HttpOnly 쿠키로 내려와 자동으로 함께 전송돼야 함.
  withCredentials: true,
})

const STORAGE_KEY = 'gemcafe-auth'

interface PersistedTokens {
  accessToken?: string
  tokenType?: string
  expiresIn?: number
}

interface PersistedSession {
  user?: { sub?: string; email?: string; nickname?: string }
  tokens?: PersistedTokens
}

function readSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedSession) : null
  } catch {
    return null
  }
}

function writeTokens(tokens: PersistedTokens) {
  const session = readSession() ?? {}
  const next: PersistedSession = {
    ...session,
    tokens: { ...(session.tokens ?? {}), ...tokens },
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function clearSessionAndRedirect() {
  localStorage.removeItem(STORAGE_KEY)
  // 풀 리로드로 React 앱·Zustand 스토어 모두 깨끗하게 초기화하면서 로그인 페이지로.
  // Vite base path(예: /dev/gemcafe/) 를 prefix 로 붙여서 절대 경로 만든다.
  // BASE_URL 끝에 / 가 붙어있으므로 join 시 중복 슬래시 방지.
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const loginPath = `${baseUrl}/login`
  if (window.location.pathname !== loginPath) {
    window.location.href = loginPath
  }
}

// ───── 요청 인터셉터: accessToken 자동 첨부 + URL 정규화 ─────
// 모든 요청에 로그인 시 받은 accessToken을 authorization 헤더로 자동 첨부.
// 로그인/회원가입 자체 호출 시점에는 토큰이 없으므로 그대로 통과.
//
// 추가로 — BE 가 가끔 응답에 `/api/v1/files/...` 처럼 baseURL prefix 까지
// 포함된 URL 을 내려주는데, 이걸 그대로 axios 에 넘기면 baseURL(`/dev/be/gemcafe/api/v1`)
// 와 중복돼 `/dev/be/gemcafe/api/v1/api/v1/...` 가 되어 404. 인터셉터에서 자동 strip.
api.interceptors.request.use((config) => {
  // /api/v1/... 형태로 들어온 URL 은 baseURL prefix 와 중복되므로 prefix 만 제거
  if (config.url && config.url.startsWith('/api/v1/')) {
    config.url = config.url.substring('/api/v1'.length)
  }

  const session = readSession()
  const token = session?.tokens?.accessToken
  if (token) {
    const tokenType = session?.tokens?.tokenType ?? 'Bearer'
    config.headers.authorization = `${tokenType} ${token}`
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
//
// gemcafe 는 refreshToken 을 HttpOnly 쿠키로 받기 때문에
// 별도의 refreshToken 값 없이 withCredentials: true 만으로 갱신 가능.

let isRefreshing = false
type PendingResolver = (newToken: string | null) => void
const pendingQueue: PendingResolver[] = []

function notifyAll(token: string | null) {
  while (pendingQueue.length > 0) {
    const cb = pendingQueue.shift()
    cb?.(token)
  }
}

interface RefreshResponseData {
  accessToken: string
  tokenType?: string
  expiresIn?: number
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    // 인터셉터 재진입 방지 위해 raw axios 사용. 쿠키는 withCredentials 로 자동 전송.
    const res = await axios.post<{ data?: RefreshResponseData } | RefreshResponseData>(
      `${API_BASE_URL}/auth/refresh`,
      undefined,
      { withCredentials: true },
    )
    const body = res.data as { data?: RefreshResponseData } & RefreshResponseData
    const data: RefreshResponseData | undefined = body?.data ?? body
    if (!data?.accessToken) return null

    writeTokens({
      accessToken: data.accessToken,
      tokenType: data.tokenType ?? 'Bearer',
      expiresIn: data.expiresIn,
    })
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

    // 인증 자체 호출(/auth/login, /auth/refresh, /auth/signup)이 401 이면 갱신 시도 무의미
    const url = (originalRequest.url ?? '').toString()
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/signup')
    ) {
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
