import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { extractErrorMessage } from '@/shared/lib/errors'
import { getAttackSuccessRate, type AttackTypeStat } from '../api'

export default function AttackTypeStats() {
  const [items, setItems] = useState<AttackTypeStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getAttackSuccessRate()
      .then((res) => {
        console.log('[GET /dashboard/attack-success-rate] response:', res)
        if (cancelled) return
        setItems(res.attackTypes)
      })
      .catch((err) => {
        console.error('[GET /dashboard/attack-success-rate] error:', err)
        if (cancelled) return
        setError(
          extractErrorMessage(err, '공격 유형별 통과율을 불러오지 못했습니다.'),
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
    <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">
        공격 유형별 통과율
      </h2>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-gray-400">표시할 데이터가 없습니다.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => {
            // passRate 가 0~1 비율인지 0~100 % 인지 BE 확정 전: 100 이하면 그대로 %, 1 이하면 *100
            const ratePct =
              item.passRate <= 1 ? item.passRate * 100 : item.passRate
            const clampedRate = Math.max(0, Math.min(100, ratePct))
            return (
              <div key={item.attackTypeId}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.attackType}</span>
                  <span className="font-semibold text-brand-500">
                    {clampedRate.toFixed(0)}%{' '}
                    <span className="text-xs font-normal text-gray-400">
                      ({item.passedCount}/{item.totalCount})
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${clampedRate}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
