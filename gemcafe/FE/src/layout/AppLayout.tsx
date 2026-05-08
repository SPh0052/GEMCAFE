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
    <div className="flex h-screen flex-col bg-gray-100 md:bg-white">
      {/* 풀 너비 헤더 — 모바일·데스크톱 공통, 화면 최상단에 sticky */}
      <AppHeader />

      <div className="flex flex-1">
        {/* 데스크톱 좌측 사이드 네비 */}
        <SideNav />

        {/* 본문 영역 — 모바일은 폰 너비 가운데, 데스크톱은 사이드 네비 옆 전체 폭 */}
        <div className="mx-auto flex min-h-0 w-full max-w-107.5 flex-1 flex-col bg-white md:mx-0 md:max-w-none">
          {/* main 을 flex column 으로 만들어 페이지가 flex-1 로 가득 채울 수 있게.
              min-h-0: 콘텐츠 길이만큼 grow 안 하도록.
              pb-[5rem]: BottomNav 가 fixed 라서 main 콘텐츠가 nav 뒤로 숨지 않게 여백 확보.
              padding 영역에서 sticky bottom-0 가 자동으로 nav 위에 위치함. */}
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom,0))] md:pb-0">
            <div className="mx-auto flex w-full flex-1 flex-col md:max-w-3xl lg:max-w-5xl">
              <Outlet />
            </div>
          </main>

          {/* AppLayout 에선 데스크톱에 SideNav 가 있으니 BottomNav 는 모바일만 */}
          <div className="md:hidden">
            <BottomNav />
          </div>
        </div>
      </div>
    </div>
  )
}
