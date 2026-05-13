import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { logout as logoutApi } from '@/features/auth/api'

/**
 * 전체 사이트 공통 헤더 (Intro / Login / Signup / 메인 앱 모두 공유).
 *
 * 인증 상태에 따라 우측 액션이 달라짐:
 *  · 로그인 안 됨: 로그인 + 회원가입
 *  · 로그인 됨:   마이페이지 + 로그아웃
 *
 * fixed 위치라 본문이 가려지지 않게 자체 spacer 를 함께 렌더링 (`withSpacer` 옵션).
 */
interface Props {
  withSpacer?: boolean
}

export default function SiteHeader({ withSpacer = true }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logoutLocal = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutApi()
    } catch (err) {
      console.error('[POST /auth/logout] error:', err)
    } finally {
      logoutLocal()
      setLoggingOut(false)
      navigate('/intro', { replace: true })
    }
  }

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 pb-3 pt-4 sm:gap-4 sm:px-10 sm:pb-4 sm:pt-6">
          <Link
            to={isAuthenticated ? '/' : '/intro'}
            className="group flex shrink-0 items-center gap-2 sm:gap-3"
          >
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="gem.cafe 로고"
              className="h-9 w-9 transition group-hover:scale-105 sm:h-12 sm:w-12"
            />
            <img
              src={`${import.meta.env.BASE_URL}logo_text.png`}
              alt="gem.cafe"
              className="h-6 sm:h-8"
            />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {isAuthenticated ? (
              <>
                <Link
                  to="/me"
                  className="whitespace-nowrap rounded-lg bg-brand-100 px-3 py-2 text-sm font-medium text-brand-500 transition hover:bg-brand-200 sm:px-5 sm:py-2.5 sm:text-base"
                >
                  마이페이지
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70 sm:px-5 sm:py-2.5 sm:text-base"
                >
                  {loggingOut && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="whitespace-nowrap rounded-lg bg-brand-100 px-3 py-2 text-sm font-medium text-brand-500 transition hover:bg-brand-200 sm:px-5 sm:py-2.5 sm:text-base"
                >
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className="whitespace-nowrap rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 sm:px-5 sm:py-2.5 sm:text-base"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {withSpacer && <div className="h-16 sm:h-24" aria-hidden="true" />}
    </>
  )
}
