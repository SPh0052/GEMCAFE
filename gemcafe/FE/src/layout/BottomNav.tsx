import { NavLink } from 'react-router-dom'
import { Home, PlusCircle, Video, User } from 'lucide-react'

// 편집 탭은 의도적으로 제외 — 편집은 "내 영상 → 상세 → 편집하기" 진입 흐름만 노출.
// 빈 편집기로 직접 들어와 영상 업로드부터 시작하는 시나리오는 더 이상 메인 동선이 아님.
const tabs = [
  { to: '/', label: '홈', icon: Home, end: true },
  { to: '/create', label: '생성하기', icon: PlusCircle },
  { to: '/videos', label: '내 영상', icon: Video },
  { to: '/me', label: '마이페이지', icon: User },
]

// BottomNav 를 사용하는 페이지의 콘텐츠가 가려지지 않도록
// 필요한 경우 main / 컨테이너에 이 만큼 padding-bottom 을 줄 수 있게 export.
//   pb-[calc(5rem+env(safe-area-inset-bottom,0))]
export const BOTTOM_NAV_HEIGHT_CLASS =
  'pb-[calc(5rem+env(safe-area-inset-bottom,0))]'

/**
 * BottomNav — 페이지 하단 고정 네비게이션.
 *
 * 모바일에선 항상 표시. 데스크톱에선 컨텍스트에 따라 다름:
 *  - AppLayout 내부에서 SideNav 와 같이 쓸 땐 BottomNav 숨겨야 (AppLayout 에서 wrapper md:hidden)
 *  - VideoEditor 처럼 SideNav 가 없는 풀스크린 페이지에선 BottomNav 가 데스크톱에도 보여야
 *
 * 컴포넌트 자체에는 md:hidden 을 박지 않고, 사용처에서 wrapping 으로 결정.
 */
export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0))]">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium transition ${
                  isActive ? 'text-brand-500' : 'text-gray-400'
                }`
              }
            >
              <Icon className="h-6 w-6" />
              <span>{t.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
