import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Mail, Lock, UtensilsCrossed, Loader2 } from 'lucide-react'
import MobileShell from '@/shared/components/MobileShell'
import Button from '@/shared/components/Button'
import TextField from '@/shared/components/TextField'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { validateEmail, validatePassword } from '@/shared/lib/validation'
import { signInWithGoogle } from './google'
import { findUserBySub } from './userRegistry'
import { login as loginApi } from './api'

interface LoginLocationState {
  /** 회원가입 직후 LoginPage 로 넘어올 때 SignupPage 가 prefill 용으로 보내주는 이메일. */
  signupEmail?: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)

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
    // 클라이언트 검증
    const emailErr = validateEmail(email)
    if (emailErr) {
      setError(emailErr)
      return
    }
    const pwErr = validatePassword(password)
    if (pwErr) {
      setError(pwErr)
      return
    }
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
      // 응답에는 토큰만 있고 이름/전화 등 사용자 프로필은 없음 — 폼 입력 기반 임시 user 생성.
      // BE 가 /me 엔드포인트 추가하면 이 자리에 한 번 더 호출해서 채우면 됨.
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

  const handleGoogleLogin = async () => {
    if (googleLoading) return
    setGoogleLoading(true)
    setError(null)
    try {
      const { accessToken, user: googleUser } = await signInWithGoogle()
      // 디버그용 — 실제로 잘 들어오는지 콘솔에서 확인
      console.log('[Google] sign-in success', { accessToken, googleUser })

      // BE 준비되기 전 임시: 로컬 레지스트리로 신규/기존 회원 판별.
      // BE 붙이는 시점엔 이 블록 통째로 fetch('/auth/google', { accessToken }) 한 번으로 대체.
      const existing = findUserBySub(googleUser.sub)

      login({
        sub: googleUser.sub,
        nickname: googleUser.name,
        email: googleUser.email,
        picture: googleUser.picture,
        phone: existing?.phone,
        gem: existing ? 0 : 0, // BE 붙으면 실제 잔액으로
      })

      if (existing) {
        // 기존 회원 → 메인으로
        navigate('/')
      } else {
        // 신규 회원 → 전화번호 입력 단계로
        navigate('/signup/phone')
      }
    } catch (err) {
      console.error('[Google] sign-in failed', err)
      setError(
        err instanceof Error ? err.message : '구글 로그인에 실패했습니다.',
      )
    } finally {
      setGoogleLoading(false)
    }
  }

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

          <Button
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {googleLoading ? '구글 로그인 중...' : '구글로 시작하기'}
          </Button>

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
