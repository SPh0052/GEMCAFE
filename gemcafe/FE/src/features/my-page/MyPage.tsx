import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Loader2,
  LogOut,
  Plus,
  Shield,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { getMe, logout as logoutApi } from '@/features/auth/api'

// 출시 전 placeholder — 실제 화면이 아직 없어 비활성화. 컴포넌트는 disabled 스타일로 노출만.
const menus = [
  { label: '이용약관', icon: FileText },
  { label: '개인정보처리방침', icon: Shield },
]

export default function MyPage() {
  const navigate = useNavigate()
  const { user, logout, setUser } = useAuthStore()
  const [loggingOut, setLoggingOut] = useState(false)

  // 마이페이지 진입 시 /users/me 로 최신 프로필 + 잼 잔액 동기화.
  // 실패해도 기존 store user 그대로 표시 — 화면 끊김 방지.
  useEffect(() => {
    let cancelled = false
    getMe()
      .then((me) => {
        if (cancelled) return
        console.log('[GET /users/me] response:', me)
        setUser({
          sub: String(me.userId),
          nickname: me.name || user?.nickname || '',
          email: me.email || user?.email || '',
          picture: me.profileImage || user?.picture,
          phone: user?.phone,
          gem: me.gem ?? 0,
        })
      })
      .catch((err) => {
        console.warn('[GET /users/me] 실패 — 기존 user 유지', err)
      })
    return () => {
      cancelled = true
    }
    // mount 시 1회만 — user 변경에 반응해 다시 부르면 setUser 가 다시 mount effect 트리거 위험.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutApi()
    } catch (err) {
      console.error('[POST /auth/logout] error:', err)
    } finally {
      logout()
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-6">
      {/* ───── 헤더 ───── */}
      <header>
        <p className="text-sm font-medium text-brand-500">Profile</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
          마이페이지
        </h1>
      </header>

      {/* ───── 프로필 카드 ───── */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        {/* 장식 — soft brand glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-100/60 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-brand-50 to-orange-100/60 shadow-inner ring-1 ring-brand-100">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt=""
                  className="h-10 w-10 object-contain"
                />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-base font-extrabold text-gray-900">
              {user.nickname}님
            </div>
            <div className="mt-0.5 truncate text-xs text-gray-500">
              {user.email}
            </div>
          </div>
        </div>
      </section>

      {/* ───── 보유 잼 카드 (거의 흰색) ───── */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-linear-to-br from-white via-white to-orange-50/40 p-6 shadow-sm">
        {/* 패턴 도트 (아주 옅게) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--color-brand-200) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-brand-100/40 blur-3xl" />

        <div className="relative">
          <div className="flex w-fit items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-600 shadow-sm">
            <Sparkles className="h-3 w-3" />
            보유 잔액
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold tracking-tight text-brand-600">
              {user.gem.toLocaleString()}
            </span>
            <span className="text-base font-semibold text-brand-500/80">
              GEM
            </span>
          </div>

          {/* 충전 — 결제 연동 전이라 비활성화. 디자인은 유지하되 disabled 톤 다운. */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-gray-200 py-3.5 text-sm font-bold text-gray-500"
          >
            <Plus className="h-4 w-4" />
            충전하기 (준비 중)
          </button>
        </div>
      </section>

      {/* ───── 메뉴 리스트 ───── */}
      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        {/* 이용약관·개인정보처리방침 — 실제 페이지 준비 전까지 disabled 표시.
            <a> 가 아니라 <div aria-disabled> 로 처리해서 키보드 포커스·클릭 모두 차단. */}
        {menus.map((m, i) => {
          const Icon = m.icon
          return (
            <div
              key={m.label}
              aria-disabled="true"
              className={`flex cursor-not-allowed items-center justify-between px-5 py-4 text-sm text-gray-400 ${
                i !== menus.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{m.label}</span>
              </div>
              <span className="text-[11px] font-medium text-gray-400">
                준비 중
              </span>
            </div>
          )
        })}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="group flex w-full items-center justify-between border-t border-gray-100 px-5 py-4 text-sm font-medium text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition group-hover:bg-rose-100">
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </span>
            <span>{loggingOut ? '로그아웃 중...' : '로그아웃'}</span>
          </div>
        </button>
      </section>

      <button
        type="button"
        className="mx-auto mt-2 text-xs text-gray-400 underline transition hover:text-gray-600"
      >
        회원탈퇴
      </button>
    </div>
  )
}
