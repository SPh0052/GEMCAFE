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

// ─── 구글 소셜 로그인 (ID Token Flow) ────────────────────────
export interface GoogleLoginRequest {
  /** GIS 가 내려준 ID 토큰(JWT). BE 가 구글 공개키로 검증. */
  idToken: string
}

/**
 * BE 가 내려주는 구글 로그인 응답.
 * - 기존 회원: isNewUser=false, 그대로 홈으로 진입
 * - 신규 회원: isNewUser=true, 토큰은 발급됐지만 추가 정보(전화번호) 입력 필요
 */
export interface GoogleLoginResponse {
  accessToken: string
  tokenType: string
  accessExpiresIn: number
  isNewUser: boolean
  email: string
  name: string
  picture: string
}

/**
 * 구글 소셜 로그인.
 * POST /api/v1/auth/google (application/json)
 *
 * 흐름:
 *   1. FE 가 GIS SDK 로 구글에서 ID 토큰(JWT) 발급받음
 *   2. 이 함수로 BE 에 idToken 전달
 *   3. BE 가 구글 공개키로 JWT 서명 검증 → 자체 세션 토큰 발급 + isNewUser 판정
 *   4. 응답으로 accessToken + 프로필 + isNewUser 수신
 *
 * refreshToken 은 HttpOnly 쿠키로 내려와 withCredentials 로 자동 저장.
 */
export async function googleLogin(
  idToken: string,
): Promise<GoogleLoginResponse> {
  const res = await api.post<ApiResponse<GoogleLoginResponse>>(
    '/auth/google',
    { idToken },
  )
  return res.data.data
}

// ─── 구글 신규 가입자 추가 정보 입력 ──────────────────────────
export interface CompleteProfileRequest {
  /** 전화번호 (숫자만, 하이픈 없음) */
  phone: string
}

/**
 * 구글 신규 가입자가 전화번호 입력 후 호출.
 * POST /api/v1/auth/google/complete-profile (application/json)
 *
 * accessToken 은 axios 인터셉터가 자동 첨부.
 * BE 가 토큰에서 userId 추출해 해당 user 에 전화번호 저장.
 */
export async function completeGoogleProfile(
  req: CompleteProfileRequest,
): Promise<void> {
  await api.post<ApiResponse<void>>('/auth/google/complete-profile', req)
}
