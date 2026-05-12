/**
 * Google Identity Services 래퍼 (ID 토큰 방식 + renderButton).
 *
 * 흐름:
 *   1. index.html 에서 https://accounts.google.com/gsi/client 스크립트 로드 → window.google 노출
 *   2. initGoogleSignIn({ onSuccess, onError }) 로 callback 등록 + initialize 호출
 *   3. renderGoogleButton(divEl) 로 구글 공식 버튼을 컨테이너에 렌더링
 *   4. 사용자가 버튼 클릭 → 구글 팝업 → 동의 후 ID 토큰(JWT) 수신 → onSuccess 콜백 호출
 *
 * prompt() 방식 대신 renderButton() 을 쓰는 이유:
 *   - One Tap prompt 는 iOS Safari, ITP, 시크릿 모드, 3rd-party 쿠키 차단 환경에서 잦은 실패
 *   - 특히 accounts.google.com/gsi/status XHR 이 withCredentials + wildcard origin 으로 CORS 차단됨
 *   - renderButton 은 사용자 클릭 → 팝업 흐름이라 이 사전 검증 단계를 건너뛰어 안정적
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

interface CredentialResponse {
  /** 구글이 발급한 ID 토큰 (JWT) */
  credential: string
  /** 'btn' | 'btn_confirm' | 'auto' | 'user' 등 */
  select_by: string
}

interface IdInitConfig {
  client_id: string
  callback: (response: CredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  ux_mode?: 'popup' | 'redirect'
}

export interface GsiButtonOptions {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number | string
  locale?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: IdInitConfig) => void
          renderButton: (
            container: HTMLElement,
            options: GsiButtonOptions,
          ) => void
          disableAutoSelect: () => void
          cancel: () => void
        }
      }
    }
  }
}

export interface GoogleUser {
  sub: string
  email: string
  email_verified: boolean
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  locale?: string
}

export interface GoogleSignInResult {
  /** ID 토큰 (JWT). BE 에 그대로 전달해서 검증 후 세션 발급 받기 */
  idToken: string
  user: GoogleUser
}

let initialized = false
let currentOnSuccess: ((r: GoogleSignInResult) => void) | null = null
let currentOnError: ((e: Error) => void) | null = null

/**
 * GIS 초기화. LoginPage 가 mount 될 때 1회 호출.
 * onSuccess 콜백은 사용자가 구글 버튼을 눌러 인증 완료된 후 호출됨.
 */
export function initGoogleSignIn(callbacks: {
  onSuccess: (r: GoogleSignInResult) => void
  onError: (e: Error) => void
}): void {
  currentOnSuccess = callbacks.onSuccess
  currentOnError = callbacks.onError

  if (initialized) return
  if (!CLIENT_ID) {
    callbacks.onError(
      new Error(
        'VITE_GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.',
      ),
    )
    return
  }
  if (!window.google?.accounts?.id) {
    callbacks.onError(
      new Error(
        'Google Identity Services 스크립트가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.',
      ),
    )
    return
  }

  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (response) => {
      try {
        const payload = decodeJwt(response.credential)
        const user: GoogleUser = {
          sub: payload.sub,
          email: payload.email,
          email_verified: !!payload.email_verified,
          name: payload.name,
          given_name: payload.given_name,
          family_name: payload.family_name,
          picture: payload.picture,
          locale: payload.locale,
        }
        currentOnSuccess?.({ idToken: response.credential, user })
      } catch (err) {
        currentOnError?.(
          err instanceof Error ? err : new Error('ID 토큰 디코딩 실패'),
        )
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    ux_mode: 'popup',
  })
  initialized = true
}

/**
 * 구글 공식 "Sign in with Google" 버튼을 지정 컨테이너에 렌더링.
 * initGoogleSignIn 호출 이후에 사용.
 */
export function renderGoogleButton(
  container: HTMLElement,
  options: GsiButtonOptions = {},
): void {
  if (!window.google?.accounts?.id) {
    console.warn('GIS 미로드 — renderGoogleButton 호출 무시됨')
    return
  }
  // 기본값: 큰 사이즈, 한국어, pill shape, 컨테이너 너비에 맞춤
  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'left',
    locale: 'ko',
    ...options,
  })
}

/**
 * 자동 선택 비활성화 — 로그아웃 시 호출해서 다음 로그인 때 계정 다시 선택하게 함.
 */
export function disableGoogleAutoSelect(): void {
  window.google?.accounts.id.disableAutoSelect()
}

/** Base64URL 디코딩 후 JSON 파싱. UTF-8 안전. */
interface GoogleIdTokenPayload {
  iss: string
  azp: string
  aud: string
  sub: string
  email: string
  email_verified: boolean
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  locale?: string
  iat: number
  exp: number
}

function decodeJwt(token: string): GoogleIdTokenPayload {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('잘못된 JWT 형식')
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
  const binary = atob(padded)
  const json = decodeURIComponent(
    Array.from(binary)
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  return JSON.parse(json) as GoogleIdTokenPayload
}
