import axios from 'axios'

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    'https://k14s307.p.ssafy.io/api/v1',
  timeout: 30_000, // 30초
})

// 모든 요청에 로그인 시 받은 accessToken을 Authorization 헤더로 자동 첨부.
// 로그인 화면 자체(/auth/login) 호출 시점에는 토큰이 아직 없으므로 그대로 통과.
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('gemmark-auth')
    if (raw) {
      const data = JSON.parse(raw) as {
        accessToken?: string
        tokenType?: string
      }
      if (data.accessToken) {
        config.headers.Authorization = `${data.tokenType ?? 'Bearer'} ${data.accessToken}`
      }
    }
  } catch {
    // localStorage 파싱 실패는 무시 — 토큰 없이 진행
  }
  return config
})
