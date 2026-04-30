import { api } from '@/shared/lib/axios'

export interface LoginRequest {
  loginId: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/**
 * 관리자 로그인.
 * POST /api/v1/auth/login (application/json)
 */
export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', req)
  return res.data.data
}

/**
 * 관리자 로그아웃.
 * POST /api/v1/auth/logout
 * Authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function logout(): Promise<void> {
  await api.post<ApiResponse<null>>('/auth/logout')
}
