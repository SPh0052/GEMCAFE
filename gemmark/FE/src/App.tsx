import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/layout/AppLayout'
import DashboardPage from '@/features/dashboard/DashboardPage'
import WatermarkInsertPage from '@/features/watermark-insert/WatermarkInsertPage'
import WatermarkDetectPage from '@/features/watermark-detect/WatermarkDetectPage'
import RobustnessTestPage from '@/features/robustness/RobustnessTestPage'
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
        <Route path="/insert" element={<WatermarkInsertPage />} />
        <Route path="/detect" element={<WatermarkDetectPage />} />
        <Route path="/robustness" element={<RobustnessTestPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}
