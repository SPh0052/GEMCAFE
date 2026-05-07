import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2, LogOut, Plus, Wallet } from 'lucide-react'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { logout as logoutApi } from '@/features/auth/api'

const menus = [
  { label: '이용약관', href: '#' },
  { label: '개인정보처리방침', href: '#' },
]

export default function MyPage() {
  const navigate = useNavigate()
  const { user, logout, chargeGem } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutApi()
    } catch (err) {
      // 서버 호출이 실패해도 로컬 세션은 정리해서 사용자가 갇히지 않도록.
      console.error('[POST /auth/logout] error:', err)
    } finally {
      logout()
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 pt-5">
      <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>

      {/* 프로필 */}
      <section className="flex flex-col items-center gap-2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-300 shadow">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            className="h-12 w-12 object-contain"
          />
        </div>
        <div className="text-center">
          <div className="font-semibold">
            {user.nickname}님, 안녕하세요!
          </div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
      </section>

      {/* 보유 잔액 */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Wallet className="h-4 w-4 text-brand-500" />
          보유 잔액
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">
            {user.gem.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">GEM</span>
        </div>
        <button
          type="button"
          onClick={() => chargeGem(5000)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          충전하기
        </button>
      </section>

      {/* 메뉴 리스트 */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {menus.map((m, i) => (
          <a
            key={m.label}
            href={m.href}
            className={`flex items-center justify-between px-5 py-4 text-sm text-gray-700 transition hover:bg-gray-50 ${
              i !== menus.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <span>{m.label}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </a>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-between border-t border-gray-100 px-5 py-4 text-sm text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{loggingOut ? '로그아웃 중...' : '로그아웃'}</span>
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </button>
      </section>

      <button
        type="button"
        className="mx-auto mt-2 text-xs text-gray-400 underline"
      >
        회원탈퇴
      </button>
    </div>
  )
}
