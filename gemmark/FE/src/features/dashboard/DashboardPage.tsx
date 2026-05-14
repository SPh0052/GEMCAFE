import { useEffect, useState } from 'react'
import { Film, BadgeCheck, BarChart3, Gauge } from 'lucide-react'
import KpiCard from '@/features/dashboard/components/KpiCard'
import VerificationTrendChart from '@/features/dashboard/components/VerificationTrendChart'
import AttackTypeStats from '@/features/dashboard/components/AttackTypeStats'
import RecentActivity from '@/features/dashboard/components/RecentActivity'
import { extractErrorMessage } from '@/shared/lib/errors'
import { getDashboardSummary, type DashboardSummary } from './api'

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getDashboardSummary()
      .then((res) => {
        console.log('[GET /dashboard/summary] response:', res)
        if (cancelled) return
        setSummary(res)
      })
      .catch((err) => {
        console.error('[GET /dashboard/summary] error:', err)
        if (cancelled) return
        setError(
          extractErrorMessage(err, '대시보드 정보를 불러오지 못했습니다.'),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">대시보드</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Film}
          label="누적 워터마크 영상"
          value={
            loading
              ? '...'
              : (summary?.totalEmbeds ?? 0).toLocaleString('ko-KR')
          }
        />
        <KpiCard
          icon={BadgeCheck}
          label="평균 삽입 처리 속도 (fps)"
          value={
            loading ? '...' : `${(summary?.avgSpeed ?? 0).toFixed(1)}fps`
          }
        />
        <KpiCard
          icon={BarChart3}
          label="강건성 평균 BER"
          value={
            loading
              ? '...'
              : `${((summary?.avgBer ?? 0) * 100).toFixed(2)}%`
          }
        />
        <KpiCard
          icon={Gauge}
          label="강건성 평균 PSNR"
          value={
            loading ? '...' : `${(summary?.avgPsnr ?? 0).toFixed(1)} dB`
          }
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
