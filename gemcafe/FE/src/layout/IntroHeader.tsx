import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { logout as logoutApi } from '@/features/auth/api'

/**
 * IntroHeader — 인트로/로그인/회원가입 페이지 공용 상단 헤더.
 *
 * 좌측: gem.cafe 로고 (클릭 시 /intro 이동)
 * 우측 (로그인 안 됨): 로그인 / 회원가입
 * 우측 (로그인 됨): 로그아웃 / 영상 생성하기
 *
 * fixed 포지셔닝이라 사용처에서 `<IntroHeaderSpacer />` 로 본문 안 가려지게 여백 확보.
 */

const ASSET = (file: string) =>
  `${import.meta.env.BASE_URL}${encodeURIComponent(file)}`

export default function IntroHeader() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const [loggingOut, setLoggingOut] = useState(false)

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
      navigate('/intro', { replace: true })
    }
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 pb-3 pt-4 sm:gap-4 sm:px-10 sm:pb-4 sm:pt-6">
        <Link
          to="/intro"
          className="group flex shrink-0 items-center gap-2 sm:gap-3"
        >
          <img
            src={ASSET('logo.png')}
            alt="gem.cafe 로고"
            className="h-9 w-9 transition group-hover:scale-105 sm:h-12 sm:w-12"
          />
          <img
            src={ASSET('logo_text.png')}
            alt="gem.cafe"
            className="h-6 sm:h-8"
          />
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-100 px-3 py-2 text-sm font-medium text-brand-500 transition hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-2.5 sm:text-base"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
              <Link
                to="/create/new"
                className="whitespace-nowrap rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 sm:px-5 sm:py-2.5 sm:text-base"
              >
                영상 생성하기
              </Link>
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
  )
}

/**
 * IntroHeader 와 짝꿍. IntroHeader 가 fixed 라 본문이 헤더 아래에 가려지지 않게
 * 같은 높이의 스페이서를 콘텐츠 영역 시작 부분에 둠. h-16 (모바일) / h-24 (데스크톱).
 */
export function IntroHeaderSpacer() {
  return <div className="h-16 sm:h-24" aria-hidden="true" />
}
