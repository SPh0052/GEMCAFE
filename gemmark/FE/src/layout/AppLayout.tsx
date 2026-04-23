import { Outlet } from 'react-router-dom'
import Sidebar from '@/layout/Sidebar'
import Topbar from '@/layout/Topbar'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen text-gray-900">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-8 pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
