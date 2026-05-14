import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Mail, Lock, Loader2 } from 'lucide-react'
import MobileShell from '@/shared/components/MobileShell'
import SiteFooter from '@/layout/SiteFooter'
import TextField from '@/shared/components/TextField'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import {
  initGoogleSignIn,
  renderGoogleButton,
  type GoogleSignInResult,
} from './google'
import { getMe, googleLogin, login as loginApi } from './api'

interface LoginLocationState {
  /** 회원가입 직후 LoginPage 로 넘어올 때 SignupPage 가 prefill 용으로 보내주는 이메일. */
  signupEmail?: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const setUser = useAuthStore((s) => s.setUser)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // 회원가입 직후라면 이메일이 미리 채워짐 (사용자는 비밀번호만 치면 됨)
  const signupEmail = (location.state as LoginLocationState | null)
    ?.signupEmail
  const [email, setEmail] = useState(signupEmail ?? '')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const tokens = await loginApi({
        email: email.trim(),
        password,
      })
      console.log('[POST /auth/login] response:', tokens)
      if (!tokens?.accessToken) {
        setError('로그인 응답이 올바르지 않습니다.')
        return
      }
      const trimmed = email.trim()
      // 1) tokens 먼저 저장 — getMe 호출 시 인터셉터가 Authorization 헤더에 자동 첨부할 수 있도록.
      //    user 는 일단 이메일 기반 임시값 — 곧바로 setUser 로 덮어씀.
      login(
        {
          sub: trimmed,
          nickname: trimmed.split('@')[0] || trimmed,
          email: trimmed,
          gem: 0,
        },
        tokens,
      )
      // 2) /users/me 로 진짜 프로필(이름·프로필이미지·잼 잔액) 조회 후 store 갱신.
      //    실패해도 (네트워크·BE 일시 장애) 로그인은 진행하고 임시 user 유지 — 다음 진입에서 재시도.
      try {
        const me = await getMe()
        console.log('[GET /users/me] response:', me)
        setUser({
          sub: String(me.userId),
          nickname: me.name || trimmed.split('@')[0] || trimmed,
          email: me.email || trimmed,
          picture: me.profileImage || undefined,
          gem: me.gem ?? 0,
        })
      } catch (meErr) {
        console.warn('[GET /users/me] 실패 — 임시 user 유지', meErr)
      }
      navigate('/', { replace: true })
    } catch (err) {
      console.error('[POST /auth/login] error:', err)
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const serverMsg = (err.response?.data as { message?: string })?.message
        if (status === 401 || status === 400) {
          setError('이메일 또는 비밀번호가 일치하지 않습니다.')
          setPassword('')
        } else if (status === 422) {
          setError(serverMsg ?? '입력값이 올바르지 않습니다.')
        } else if (err.code === 'ERR_NETWORK' || !err.response) {
          setError('네트워크 연결을 확인해주세요.')
        } else {
          setError(serverMsg ?? '로그인에 실패했습니다.')
        }
      } else {
        setError('로그인에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  /** 구글 버튼 클릭 → GIS 가 ID 토큰 발급 후 호출되는 콜백 */
  const handleGoogleSuccess = useCallback(
    async (res: GoogleSignInResult) => {
      const { idToken, user: googleUser } = res
      setGoogleLoading(true)
      setError(null)
      try {
        console.log('[Google] sign-in success', { idToken, googleUser })

        const session = await googleLogin(idToken)
        console.log('[POST /auth/google] response:', session)

        // BE 응답에는 sub 가 없어 email 을 user 식별자로 사용.
        // isNewUser=true 라도 BE 가 토큰을 발급해줘서 그대로 로그인 처리,
        // 다만 전화번호 미입력 상태이므로 /signup/phone 으로 보냄.
        login(
          {
            sub: session.email,
            nickname: session.name || googleUser.name,
            email: session.email,
            picture: session.picture || googleUser.picture,
            phone: undefined,
            gem: 0,
          },
          {
            accessToken: session.accessToken,
            tokenType: session.tokenType,
            expiresIn: session.expiresIn,
          },
        )

        // 신규가입자가 아니면 /users/me 로 BE 측 정식 프로필(이름·프로필이미지·잼) 동기화.
        // 신규는 전화번호 입력 단계로 가야 하므로 me 조회 생략 (어차피 곧 재진입).
        if (!session.isNewUser) {
          try {
            const me = await getMe()
            console.log('[GET /users/me] response:', me)
            setUser({
              sub: String(me.userId),
              nickname: me.name || session.name || googleUser.name,
              email: me.email || session.email,
              picture:
                me.profileImage || session.picture || googleUser.picture,
              gem: me.gem ?? 0,
            })
          } catch (meErr) {
            console.warn('[GET /users/me] 실패 — Google 응답 user 유지', meErr)
          }
        }

        if (session.isNewUser) {
          navigate('/signup/phone', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      } catch (err) {
        console.error('[Google] BE 인증 실패', err)
        setError(
          err instanceof Error
            ? err.message
            : '구글 로그인 처리에 실패했습니다.',
        )
      } finally {
        setGoogleLoading(false)
      }
    },
    [login, setUser, navigate],
  )

  const handleGoogleError = useCallback((err: Error) => {
    console.error('[Google] sign-in failed', err)
    setError(err.message)
  }, [])

  // GIS 초기화 + 공식 구글 버튼 렌더링.
  // index.html 의 `async defer` 스크립트가 늦게 로드될 수 있어, window.google
  // 가 준비될 때까지 폴링 (최대 5초). 그 안에 로드 안 되면 에러 표시.
  useEffect(() => {
    let cancelled = false
    let elapsed = 0
    const POLL_INTERVAL = 100
    const MAX_WAIT = 5000

    const tryInit = () => {
      if (cancelled) return

      if (window.google?.accounts?.id) {
        initGoogleSignIn({
          onSuccess: handleGoogleSuccess,
          onError: handleGoogleError,
        })
        if (googleBtnRef.current) {
          const width = Math.min(googleBtnRef.current.clientWidth || 320, 400)
          renderGoogleButton(googleBtnRef.current, { width })
        }
        return
      }

      elapsed += POLL_INTERVAL
      if (elapsed >= MAX_WAIT) {
        handleGoogleError(
          new Error(
            'Google 로그인 스크립트를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.',
          ),
        )
        return
      }
      setTimeout(tryInit, POLL_INTERVAL)
    }

    tryInit()
    return () => {
      cancelled = true
    }
  }, [handleGoogleSuccess, handleGoogleError])

  return (
    <>
      <MobileShell>
        <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-10">
          {/* 배경 그라데이션 + 블러 orb */}
          <div className="pointer-events-none absolute inset-0 -z-20 bg-linear-to-b from-orange-50/60 via-white to-amber-50/40" />
          <div className="pointer-events-none absolute -left-20 top-10 -z-10 h-60 w-60 rounded-full bg-brand-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-20 -z-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />

          {/* ───── 로고 ───── */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex items-center gap-4">
              <img
                src={`${import.meta.env.BASE_URL}logo.png`}
                alt="gem.cafe 로고"
                className="h-19 w-19"
              />
              <img
                src={`${import.meta.env.BASE_URL}logo_text.png`}
                alt="gem.cafe"
                className="h-13"
              />
            </div>
            <p className="text-sm text-gray-500">
              로그인하고 영상을 만들어보세요.
            </p>
          </div>

        {/* ───── 폼 카드 ───── */}
        <div className="rounded-3xl border border-gray-100 bg-white/90 p-6 shadow-md shadow-brand-100/30 backdrop-blur">
          <div className="space-y-4">
            <TextField
              label="이메일"
              type="email"
              placeholder="name@example.com"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextField
              label="비밀번호"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              rightSlot={
                <a
                  href="#"
                  className="text-xs font-semibold text-brand-500 transition hover:text-brand-600 hover:underline"
                >
                  비밀번호 찾기
                </a>
              }
            />

            <button
              type="button"
              onClick={handleLogin}
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-brand-500 to-orange-500 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-500/30 transition hover:from-brand-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? '로그인 중...' : '로그인'}
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-4 text-xs font-medium text-gray-400">
                또는
              </span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* 구글 공식 버튼 — GIS 가 직접 렌더링 */}
            <div className="flex justify-center">
              <div ref={googleBtnRef} className="w-full max-w-100" />
            </div>
            {googleLoading && (
              <div className="flex justify-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                구글 로그인 처리 중...
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center text-sm font-medium text-rose-600">
                {error}
              </p>
            )}
          </div>
        </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <Link
              to="/signup"
              className="font-bold text-brand-500 transition hover:text-brand-600 hover:underline"
            >
              회원가입
            </Link>
          </p>
        </div>
      </MobileShell>
      <SiteFooter />
    </>
  )
}
