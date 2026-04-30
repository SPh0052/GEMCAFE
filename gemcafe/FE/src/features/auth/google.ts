/**
 * Google Identity Services 래퍼.
 *
 * 흐름:
 *   1. index.html 에서 https://accounts.google.com/gsi/client 스크립트 로드 → window.google 노출
 *   2. signInWithGoogle() 호출 시 OAuth 토큰 클라이언트 생성 → 구글 팝업 띄움
 *   3. 사용자가 동의하면 access_token 수신 → Google userinfo 엔드포인트로 사용자 정보 조회
 *   4. { accessToken, user } 반환
 *
 * 백엔드가 준비되면 이 모듈은 그대로 두고, 호출하는 쪽에서 받은 accessToken 을
 * 백엔드로 보내 검증/세션 발급받는 한 줄만 추가하면 된다.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
}

interface TokenClient {
  requestAccessToken: () => void
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (err: unknown) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient
        }
      }
    }
  }
}

export interface GoogleUser {
  /** 구글 측 사용자 고유 ID (sub claim) */
  sub: string
  email: string
  /** 이메일 인증 여부 */
  email_verified: boolean
  /** 풀 네임 */
  name: string
  /** 이름(given) */
  given_name?: string
  /** 성(family) */
  family_name?: string
  /** 프로필 사진 URL */
  picture?: string
  /** 언어 로케일 (예: 'ko') */
  locale?: string
}

export interface GoogleSignInResult {
  accessToken: string
  user: GoogleUser
}

/**
 * 구글 로그인 팝업 띄우고 사용자 정보까지 받아온다.
 * @throws Client ID 미설정 / GIS 미로드 / 사용자 취소 / 네트워크 에러
 */
export function signInWithGoogle(): Promise<GoogleSignInResult> {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(
        new Error(
          'VITE_GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.',
        ),
      )
      return
    }
    if (!window.google?.accounts?.oauth2) {
      reject(
        new Error(
          'Google Identity Services 스크립트가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.',
        ),
      )
      return
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      // openid: ID 토큰 / email + profile: userinfo 조회용
      scope: 'openid email profile',
      callback: async (response) => {
        if (response.error) {
          reject(new Error(`Google OAuth 실패: ${response.error}`))
          return
        }
        try {
          const user = await fetchGoogleUserInfo(response.access_token)
          resolve({ accessToken: response.access_token, user })
        } catch (err) {
          reject(err)
        }
      },
      error_callback: (err) => reject(err),
    })

    client.requestAccessToken()
  })
}

/**
 * access_token 으로 구글 userinfo 엔드포인트 호출.
 * (BE 없이도 사용자 프로필을 표시하기 위함)
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`구글 사용자 정보 조회 실패 (HTTP ${res.status})`)
  }
  return (await res.json()) as GoogleUser
}
