import { Film, BadgeCheck, BarChart3, Gauge } from 'lucide-react'
import KpiCard from '@/features/dashboard/components/KpiCard'
import VerificationTrendChart from '@/features/dashboard/components/VerificationTrendChart'
import AttackTypeStats from '@/features/dashboard/components/AttackTypeStats'
import RecentActivity from '@/features/dashboard/components/RecentActivity'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">대시보드</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Film}
          badge="+142 오늘"
          label="누적 워터마크 영상"
          value="12,847"
        />
        <KpiCard
          icon={BadgeCheck}
          badge="최근 영상 기준"
          label="평균 삽입 처리 시간 (초)"
          value="12.4s"
          sub="[최근 1개 영상 평균]"
        />
        <KpiCard
          icon={BarChart3}
          badge="임계값 10% 이하"
          label="강건성 평균 BER"
          value="2.1%"
        />
        <KpiCard
          icon={Gauge}
          badge="화질 양호 수준"
          label="강건성 평균 PSNR"
          value="39.8 dB"
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
