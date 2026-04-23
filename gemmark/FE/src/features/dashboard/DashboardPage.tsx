import {
  Film,
  BadgeCheck,
  BarChart3,
  Aperture,
  Calendar,
} from 'lucide-react'
import KpiCard from '@/features/dashboard/components/KpiCard'
import VerificationTrendChart from '@/features/dashboard/components/VerificationTrendChart'
import AttackTypeStats from '@/features/dashboard/components/AttackTypeStats'
import RecentActivity from '@/features/dashboard/components/RecentActivity'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50"
        >
          <Calendar className="h-4 w-4 text-brand-500" />
          지난 14일
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Film}
          badge="+143 오늘"
          label="누적 워터마크 영상"
          value="12,847"
        />
        <KpiCard
          icon={BadgeCheck}
          badge="AI 탐지 98.5%"
          label="오늘 검증 요청"
          value="342"
        />
        <KpiCard
          icon={BarChart3}
          badge="임계값 10% 이하"
          label="평균 BER"
          value="4.2%"
        />
        <KpiCard
          icon={Aperture}
          badge="화질 열화 미미"
          label="평균 PSNR"
          value="42.7 dB"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VerificationTrendChart />
        </div>
        <AttackTypeStats />
      </div>

      <RecentActivity />
    </div>
  )
}
