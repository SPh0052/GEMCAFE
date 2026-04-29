import { Bell, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/useAuthStore'

export default function Topbar() {
  const navigate = useNavigate()
  const { username, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
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
        aria-label="로그아웃"
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
      >
        <LogOut className="h-4 w-4" />
        로그아웃
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
