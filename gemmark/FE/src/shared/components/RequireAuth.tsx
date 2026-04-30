import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/useAuthStore'

/**
 * 로그인 안 된 상태로 보호된 라우트 접근 시 /login 으로 리다이렉트.
 * 로그인 후 원래 가려던 곳으로 돌아오도록 location.state로 전달.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
