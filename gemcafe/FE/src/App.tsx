import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/layout/AppLayout'
import RequireAuth from '@/shared/components/RequireAuth'
import LoginPage from '@/features/auth/LoginPage'
import SignupPage from '@/features/auth/SignupPage'
import CreateVideoPage from '@/features/create-video/CreateVideoPage'
import CreatingPage from '@/features/create-video/CreatingPage'
import MyVideosPage from '@/features/my-videos/MyVideosPage'
import VideoDetailPage from '@/features/my-videos/VideoDetailPage'
import MyPage from '@/features/my-page/MyPage'

export default function App() {
  return (
    <Routes>
      {/* 로그인/회원가입 — 레이아웃 없이 독립 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* 로딩 페이지 — 레이아웃 자체적으로 포함 */}
      <Route
        path="/creating"
        element={
          <RequireAuth>
            <CreatingPage />
          </RequireAuth>
        }
      />

      {/* 메인 앱 — 로그인 필요 + AppLayout (헤더+하단네비) */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<CreateVideoPage />} />
        <Route path="/videos" element={<MyVideosPage />} />
        <Route path="/videos/:id" element={<VideoDetailPage />} />
        <Route path="/me" element={<MyPage />} />
      </Route>
    </Routes>
  )
}
