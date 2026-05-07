import { api } from '@/shared/lib/axios'

export interface SignupRequest {
  email: string
  password: string
  name: string
  phone: string
}

export interface SignupResponse {
  userId: number
}

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/**
 * 일반 회원가입.
 * POST /api/v1/auth/signup (application/json)
 *
 * 응답으로는 userId 만 반환되며 토큰은 따로 로그인 호출로 받음.
 */
export async function signup(req: SignupRequest): Promise<SignupResponse> {
  const res = await api.post<ApiResponse<SignupResponse>>('/auth/signup', req)
  return res.data.data
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

/**
 * 일반 로그인.
 * POST /api/v1/auth/login (application/json)
 *
 * 응답에는 토큰만 옴 — 사용자 정보(이름·전화번호 등)는 별도 /me 같은 엔드포인트로
 * 가져와야 하지만, 회원가입 직후 자동 로그인 케이스는 폼에서 입력한 정보를 그대로 사용 가능.
 */
export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', req)
  return res.data.data
}

/**
 * 로그아웃.
 * POST /api/v1/auth/logout
 *
 * refreshToken 은 쿠키로 자동 전송 (axios withCredentials: true).
 * authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function logout(): Promise<void> {
  await api.post<ApiResponse<unknown>>('/auth/logout')
}
