import { Outlet } from 'react-router-dom'
import MobileShell from '@/shared/components/MobileShell'
import AppHeader from '@/layout/AppHeader'
import BottomNav from '@/layout/BottomNav'

export default function AppLayout() {
  return (
    <MobileShell>
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </MobileShell>
  )
}
