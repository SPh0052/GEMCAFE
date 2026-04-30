import { useState } from 'react'
import { Bell, Loader2, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { logout as logoutApi } from '@/features/auth/api'

export default function Topbar() {
  const navigate = useNavigate()
  const { username, logout } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutApi()
    } catch (err) {
      // 서버 호출이 실패해도 로컬 세션은 정리해서 사용자가 갇히지 않도록 한다.
      console.error('로그아웃 API 실패', err)
    } finally {
      logout()
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="flex items-center justify-end gap-5 px-8 py-5">
      <button
        type="button"
        aria-label="알림"
        className="text-gray-500 transition hover:text-gray-700"
      >
        <Bell className="h-5 w-5" />
      </button>
      <div className="h-8 w-px bg-gray-200" />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-semibold">
            {username ?? '관리자'}
          </div>
          <div className="text-xs text-gray-500">보안 분석가</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-brand-300 to-brand-500 text-white">
          <UserAvatar />
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        aria-label="로그아웃"
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {loggingOut ? '로그아웃 중...' : '로그아웃'}
      </button>
    </header>
  )
}

function UserAvatar() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6v1H4v-1z" />
    </svg>
  )
}
