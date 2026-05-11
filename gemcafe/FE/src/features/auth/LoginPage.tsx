import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Mail, Lock, UtensilsCrossed, Loader2 } from 'lucide-react'
import MobileShell from '@/shared/components/MobileShell'
import Button from '@/shared/components/Button'
import TextField from '@/shared/components/TextField'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import {
  initGoogleSignIn,
  renderGoogleButton,
  type GoogleSignInResult,
} from './google'
import { googleLogin, login as loginApi } from './api'

interface LoginLocationState {
  /** 회원가입 직후 LoginPage 로 넘어올 때 SignupPage 가 prefill 용으로 보내주는 이메일. */
  signupEmail?: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
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
      login(
        {
          sub: trimmed,
          nickname: trimmed.split('@')[0] || trimmed,
          email: trimmed,
          gem: 0,
        },
        tokens,
      )
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

        login(
          {
            sub: session.user.sub,
            nickname:
              session.user.nickname ?? session.user.name ?? googleUser.name,
            email: session.user.email,
            picture: session.user.picture ?? googleUser.picture,
            phone: session.user.phone,
            gem: session.user.gem ?? 0,
          },
          {
            accessToken: session.accessToken,
            tokenType: session.tokenType,
            expiresIn: session.expiresIn,
          },
        )

        if (session.user.isNewUser) {
          navigate('/signup/phone')
        } else {
          navigate('/')
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
    [login, navigate],
  )

  const handleGoogleError = useCallback((err: Error) => {
    console.error('[Google] sign-in failed', err)
    setError(err.message)
  }, [])

  // GIS 초기화 + 공식 구글 버튼 렌더링
  useEffect(() => {
    initGoogleSignIn({
      onSuccess: handleGoogleSuccess,
      onError: handleGoogleError,
    })
    if (googleBtnRef.current) {
      // 컨테이너의 실측 너비를 픽셀로 전달 (renderButton 은 % 미지원)
      const width = Math.min(googleBtnRef.current.clientWidth || 320, 400)
      renderGoogleButton(googleBtnRef.current, { width })
    }
  }, [handleGoogleSuccess, handleGoogleError])

  return (
    <MobileShell>
      <div className="flex flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-7 w-7 text-brand-500" />
            <span className="text-3xl font-bold">
              <span className="text-brand-500">gem</span>.cafe
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            다시 오신 것을 환영합니다
          </p>
        </div>

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
                className="text-xs font-medium text-brand-500 hover:underline"
              >
                비밀번호 찾기
              </a>
            }
          />

          <Button
            size="lg"
            fullWidth
            onClick={handleLogin}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? '로그인 중...' : '로그인'}
          </Button>

          <div className="relative flex items-center py-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-xs text-gray-400">또는</span>
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
            <p className="text-center text-sm text-rose-600">{error}</p>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-semibold text-brand-500">
            회원가입
          </Link>
        </p>
      </div>
    </MobileShell>
  )
}
