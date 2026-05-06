import { NavLink } from 'react-router-dom'
import { Home, PlusCircle, Video, User } from 'lucide-react'

const tabs = [
  { to: '/', label: '홈', icon: Home, end: true },
  { to: '/create', label: '생성하기', icon: PlusCircle },
  { to: '/videos', label: '내 영상', icon: Video },
  { to: '/me', label: '마이페이지', icon: User },
]

/**
 * 데스크톱(md+) 좌측 사이드 네비. 헤더가 풀 너비라 로고는 거기 두고
 * 사이드는 메뉴만 담당. 모바일에선 hidden.
 */
export default function SideNav() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-100 bg-white md:flex lg:w-64">
      <nav className="flex flex-col gap-1 px-3 py-5">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{t.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
