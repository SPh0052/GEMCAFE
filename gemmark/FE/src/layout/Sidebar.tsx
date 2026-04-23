import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ImagePlus,
  Search,
  ShieldCheck,
  FileText,
} from 'lucide-react'

const nav = [
  { to: '/', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/insert', label: '워터마크 삽입', icon: ImagePlus },
  { to: '/detect', label: '워터마크 검출', icon: Search },
  { to: '/robustness', label: '강건성 테스트', icon: ShieldCheck },
  { to: '/reports', label: '보고서 관리', icon: FileText },
]

export default function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-6 pt-6 pb-8">
        <img src="/logo.png" alt="gem.mark" className="h-12 w-auto" />
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-100 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
