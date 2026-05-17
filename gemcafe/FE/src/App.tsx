import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/layout/AppLayout'
import RequireAuth from '@/shared/components/RequireAuth'
import LoginPage from '@/features/auth/LoginPage'
import SignupPage from '@/features/auth/SignupPage'
import CompleteSignupPage from '@/features/auth/CompleteSignupPage'
import IntroPage from '@/features/intro/IntroPage'
import HomePage from '@/features/home/HomePage'
import CreateLandingPage from '@/features/create-video/CreateLandingPage'
import CreateVideoPage from '@/features/create-video/CreateVideoPage'
import CreatingPage from '@/features/create-video/CreatingPage'
import MyVideosPage from '@/features/my-videos/MyVideosPage'
import VideoDetailPage from '@/features/my-videos/VideoDetailPage'
import MyPage from '@/features/my-page/MyPage'
import VideoEditor from '@/components/VideoEditor'
import VideoCheckPage from '@/features/debug/VideoCheckPage'
import PWAUpdatePrompt from '@/shared/components/PWAUpdatePrompt'
import InstallAppBanner from '@/shared/components/InstallAppBanner'

export default function App() {
  return (
    <>
      <PWAUpdatePrompt />
      <InstallAppBanner />
      <Routes>
      {/* 소개 페이지 — 비로그인 사용자 진입점, 인증 불필요 */}
      <Route path="/intro" element={<IntroPage />} />

      {/* 로그인/회원가입 — 레이아웃 없이 독립 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/signup/phone"
        element={
          <RequireAuth>
            <CompleteSignupPage />
          </RequireAuth>
        }
      />

      {/* 로딩 페이지 — 레이아웃 자체적으로 포함 */}
      <Route
        path="/creating"
        element={
          <RequireAuth>
            <CreatingPage />
          </RequireAuth>
        }
      />

      {/* 영상 편집 페이지 — 풀스크린 단독 (헤더/네비 없음) */}
      <Route
        path="/editor"
        element={
          <RequireAuth>
            <VideoEditor />
          </RequireAuth>
        }
      />

      {/* 디버그: 영상 서빙 점검 — 로컬에서 BE 응답 검증용 */}
      <Route
        path="/debug/video-check"
        element={
          <RequireAuth>
            <VideoCheckPage />
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
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateLandingPage />} />
        <Route path="/create/new" element={<CreateVideoPage />} />
        <Route path="/videos" element={<MyVideosPage />} />
        <Route path="/videos/:id" element={<VideoDetailPage />} />
        <Route path="/me" element={<MyPage />} />
      </Route>

      </Routes>
    </>
  )
}
