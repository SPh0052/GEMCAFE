import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/useAuthStore'

// 로그인 안 된 상태면 /intro 소개 페이지로 리다이렉트.
// IntroPage 에서 다시 로그인/회원가입 버튼으로 분기.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/intro" state={{ from: location }} replace />
  }

  return <>{children}</>
}
