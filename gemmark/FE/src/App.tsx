import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/layout/AppLayout'
import DashboardPage from '@/features/dashboard/DashboardPage'
import WatermarkInsertPage from '@/features/watermark-insert/WatermarkInsertPage'
import WatermarkInsertCreatePage from '@/features/watermark-insert/WatermarkInsertCreatePage'
import WatermarkInsertDetailPage from '@/features/watermark-insert/WatermarkInsertDetailPage'
import WatermarkDetectPage from '@/features/watermark-detect/WatermarkDetectPage'
import WatermarkDetectCreatePage from '@/features/watermark-detect/WatermarkDetectCreatePage'
import WatermarkDetectDetailPage from '@/features/watermark-detect/WatermarkDetectDetailPage'
import RobustnessTestPage from '@/features/robustness/RobustnessTestPage'
import RobustnessTestCreatePage from '@/features/robustness/RobustnessTestCreatePage'
import RobustnessTestDetailPage from '@/features/robustness/RobustnessTestDetailPage'
import ReportsPage from '@/features/reports/ReportsPage'
import Playground from '@/test/Playground'

export default function App() {
  return (
    <Routes>
      {/* 🧪 학습용 실험실 — 사이드바 없이 단독 페이지 */}
      <Route path="/test" element={<Playground />} />

      {/* 일반 페이지들은 레이아웃(사이드바 + 탑바) 안에서 */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />

        {/* 워터마크 삽입: 리스트 → 생성 / 상세 */}
        <Route path="/insert" element={<WatermarkInsertPage />} />
        <Route path="/insert/new" element={<WatermarkInsertCreatePage />} />
        <Route path="/insert/:id" element={<WatermarkInsertDetailPage />} />

        {/* 워터마크 검증: 리스트 → 신규 검증 / 상세 */}
        <Route path="/detect" element={<WatermarkDetectPage />} />
        <Route path="/detect/new" element={<WatermarkDetectCreatePage />} />
        <Route path="/detect/:id" element={<WatermarkDetectDetailPage />} />

        {/* 강건성 테스트: 리스트 → 신규 테스트 */}
        <Route path="/robustness" element={<RobustnessTestPage />} />
        <Route
          path="/robustness/new"
          element={<RobustnessTestCreatePage />}
        />
        <Route
          path="/robustness/:id"
          element={<RobustnessTestDetailPage />}
        />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}
