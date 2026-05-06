import { Outlet } from 'react-router-dom'
import AppHeader from '@/layout/AppHeader'
import BottomNav from '@/layout/BottomNav'
import SideNav from '@/layout/SideNav'

/**
 * 메인 앱 레이아웃 — 모바일/데스크톱 반응형.
 *
 * 레이아웃 구조:
 *   ┌─ AppHeader (항상 풀 너비, sticky top)
 *   ├─ flex row
 *   │   ├─ SideNav (md+ 에서만 표시, 좌측 고정폭)
 *   │   └─ 본문 컬럼
 *   │       ├─ <main> + <Outlet />
 *   │       └─ BottomNav (md 이하만 표시)
 *
 * 모바일에서는 본문 컬럼이 폰 모양(max-w 430px)으로 가운데 정렬,
 * 데스크톱에서는 사이드 네비 옆 전체 너비로 확장.
 */
export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:bg-white">
      {/* 풀 너비 헤더 — 모바일·데스크톱 공통, 화면 최상단에 sticky */}
      <AppHeader />

      <div className="flex flex-1">
        {/* 데스크톱 좌측 사이드 네비 */}
        <SideNav />

        {/* 본문 영역 — 모바일은 폰 너비 가운데, 데스크톱은 사이드 네비 옆 전체 폭 */}
        <div className="mx-auto flex w-full max-w-107.5 flex-1 flex-col bg-white md:mx-0 md:max-w-none">
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full md:max-w-3xl lg:max-w-5xl">
              <Outlet />
            </div>
          </main>

          {/* 모바일 전용 하단 네비 */}
          <div className="md:hidden">
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  )
}
