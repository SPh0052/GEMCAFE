import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { login as loginApi } from './api'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // 로그인 후 원래 가려던 페이지로 복귀 (없으면 대시보드)
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/'

  // 필드별 유효성 — 매 렌더 동기적으로 계산. 에러 없으면 null.
  const usernameError = useMemo(() => validateUsername(username), [username])
  const passwordError = useMemo(() => validatePassword(password), [password])

  // 사용자가 한 번도 안 만진 필드는 에러를 숨김 (제출 시도 후엔 모두 표시)
  const showUsernameError =
    Boolean(usernameError) && (usernameTouched || submitAttempted)
  const showPasswordError =
    Boolean(passwordError) && (passwordTouched || submitAttempted)

  const isFormValid = !usernameError && !passwordError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    setServerError(null)

    if (!isFormValid) return

    setSubmitting(true)
    try {
      const tokens = await loginApi({ loginId: username, password })
      login({ username, ...tokens })
      navigate(from, { replace: true })
    } catch (err) {
      console.error('로그인 실패', err)
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 422) {
          setServerError('입력값이 올바르지 않습니다.')
        } else if (status === 401 || status === 400) {
          setServerError('아이디 또는 비밀번호가 일치하지 않습니다.')
        } else {
          setServerError(
            err.response?.data?.message ??
              '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
          )
        }
      } else {
        setServerError('로그인에 실패했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="mb-10 flex flex-col items-center">
          <img src="/logo.png" alt="gem.mark" className="h-20 w-auto" />
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* 아이디 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <label
                htmlFor="username"
                className="w-20 shrink-0 text-sm font-medium text-gray-700"
              >
                아이디
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (serverError) setServerError(null)
                }}
                onBlur={() => setUsernameTouched(true)}
                aria-invalid={showUsernameError}
                aria-describedby={
                  showUsernameError ? 'username-error' : undefined
                }
                className={`flex-1 rounded-md border bg-gray-100 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                  showUsernameError
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                    : 'border-gray-200 focus:border-brand-400 focus:ring-brand-100'
                }`}
                autoFocus
                autoComplete="username"
              />
            </div>
            {showUsernameError && (
              <p
                id="username-error"
                className="pl-23 text-xs text-rose-600"
              >
                {usernameError}
              </p>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <label
                htmlFor="password"
                className="w-20 shrink-0 text-sm font-medium text-gray-700"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (serverError) setServerError(null)
                }}
                onBlur={() => setPasswordTouched(true)}
                aria-invalid={showPasswordError}
                aria-describedby={
                  showPasswordError ? 'password-error' : undefined
                }
                className={`flex-1 rounded-md border bg-gray-100 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                  showPasswordError
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                    : 'border-gray-200 focus:border-brand-400 focus:ring-brand-100'
                }`}
                autoComplete="current-password"
              />
            </div>
            {showPasswordError && (
              <p
                id="password-error"
                className="pl-23 text-xs text-rose-600"
              >
                {passwordError}
              </p>
            )}
          </div>

          {/* 서버 에러 (제출 후 백엔드 응답으로 받는 에러) */}
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (submitAttempted && !isFormValid)}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

/**
 * 아이디 유효성 — 백엔드 규칙을 정확히 모르므로 진입장벽 낮게 잡음.
 * 명백히 잘못된 입력만 거른다.
 */
function validateUsername(value: string): string | null {
  if (!value.trim()) return '아이디를 입력해주세요.'
  if (value.length < 2) return '아이디는 2자 이상이어야 합니다.'
  if (value.length > 30) return '아이디는 30자 이하여야 합니다.'
  if (/\s/.test(value)) return '아이디에 공백을 포함할 수 없습니다.'
  return null
}

function validatePassword(value: string): string | null {
  if (!value) return '비밀번호를 입력해주세요.'
  if (value.length < 4) return '비밀번호는 4자 이상이어야 합니다.'
  if (value.length > 64) return '비밀번호는 64자 이하여야 합니다.'
  return null
}
