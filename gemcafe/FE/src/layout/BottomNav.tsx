import { NavLink } from 'react-router-dom'
import { Home, PlusCircle, Scissors, Video, User } from 'lucide-react'

const tabs = [
  { to: '/', label: '홈', icon: Home, end: true },
  { to: '/create', label: '생성하기', icon: PlusCircle },
  { to: '/editor', label: '편집', icon: Scissors },
  { to: '/videos', label: '내 영상', icon: Video },
  { to: '/me', label: '마이페이지', icon: User },
]

// BottomNav 를 사용하는 페이지의 콘텐츠가 가려지지 않도록
// 필요한 경우 main / 컨테이너에 이 만큼 padding-bottom 을 줄 수 있게 export.
//   pb-[calc(5rem+env(safe-area-inset-bottom,0))]
export const BOTTOM_NAV_HEIGHT_CLASS =
  'pb-[calc(5rem+env(safe-area-inset-bottom,0))]'

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-around px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom,0))]">
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
