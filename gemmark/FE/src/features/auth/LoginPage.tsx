import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/shared/stores/useAuthStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 로그인 후 원래 가려던 페이지로 복귀 (없으면 대시보드)
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('아이디와 비밀번호를 모두 입력해주세요.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // TODO: 실제 로그인 API 연결. 지금은 입력값 그대로 통과.
      await new Promise((r) => setTimeout(r, 300))
      login(username)
      navigate(from, { replace: true })
    } catch (err) {
      console.error('로그인 실패', err)
      setError('로그인에 실패했습니다.')
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
        <form onSubmit={handleSubmit} className="space-y-5">
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
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              autoFocus
            />
          </div>
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
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
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
