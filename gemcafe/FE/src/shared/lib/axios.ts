import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  withCredentials: true,
})

const STORAGE_KEY = 'gemcafe-auth'

interface StoredSession {
  user?: { sub?: string; email?: string }
  tokens?: {
    accessToken?: string
    tokenType?: string
    expiresIn?: number
  }
}

// 모든 요청에 로그인 시 받은 accessToken 을 authorization 헤더로 자동 첨부.
// 로그인/회원가입 자체 호출 시점에는 토큰이 없으므로 그대로 통과.
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const session = JSON.parse(raw) as StoredSession
      const token = session.tokens?.accessToken
      if (token) {
        const tokenType = session.tokens?.tokenType ?? 'Bearer'
        config.headers.authorization = `${tokenType} ${token}`
      }
    }
  } catch {
    // localStorage 파싱 실패는 무시 — 토큰 없이 진행
  }
  return config
})
