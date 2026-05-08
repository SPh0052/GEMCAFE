import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { extractErrorMessage } from '@/shared/lib/errors'
import { getPsnrDistribution, type PsnrBin } from '../api'

// 색상 팔레트 — bin 개수만큼 cycle. brand-* 톤으로 그라데이션.
const BIN_COLORS = [
  'bg-brand-100',
  'bg-brand-200',
  'bg-brand-300',
  'bg-brand-400',
  'bg-brand-600',
]

export default function VerificationTrendChart() {
  const [bins, setBins] = useState<PsnrBin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getPsnrDistribution()
      .then((res) => {
        console.log('[GET /dashboard/psnr-distribution] response:', res)
        if (cancelled) return
        setBins(res.bins)
      })
      .catch((err) => {
        console.error('[GET /dashboard/psnr-distribution] error:', err)
        if (cancelled) return
        setError(extractErrorMessage(err, 'PSNR 분포를 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 차트 정규화: 최댓값 기준 % 환산. count 모두 0 이면 0%.
  const maxCount = bins.reduce((m, b) => Math.max(m, b.count), 0)

  return (
    <div className="h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">PSNR 분포별 영상 수</h2>
      <p className="mt-1 text-sm text-gray-500">PSNR 구간별로 본 영상 수 분포</p>

      {loading && (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="relative mt-6 h-60">
            {/* 가로 그리드 라인 */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-dashed border-gray-100" />
              ))}
            </div>

            {/* 막대들 — bin 컨테이너에도 h-full 줘야 자식 % height 가 작동 */}
            <div className="relative flex h-full items-end gap-6 px-2">
              {bins.map((bin, i) => {
                const heightPct =
                  maxCount > 0 ? (bin.count / maxCount) * 100 : 0
                return (
                  <div
                    key={`${bin.label}-${i}`}
                    className="relative flex h-full flex-1 flex-col justify-end"
                    title={`${bin.label}: ${bin.count} 영상`}
                  >
                    {/* count 표시 — 막대 위에 작게 */}
                    {bin.count > 0 && (
                      <span
                        className="mb-1 text-center text-xs font-semibold text-gray-700"
                        style={{
                          // 막대 꼭대기 위로 올라가지 않게 height % 만큼 아래에서 띄움
                        }}
                      >
                        {bin.count}
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        BIN_COLORS[i % BIN_COLORS.length]
                      }`}
                      style={{ height: `${heightPct}%`, minHeight: 2 }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* x축 레이블 */}
          <div className="mt-3 flex gap-6 px-2">
            {bins.map((bin, i) => (
              <div
                key={`${bin.label}-${i}-label`}
                className="flex-1 text-center text-xs font-medium text-gray-500"
              >
                {bin.label}
              </div>
            ))}
          </div>

          {bins.length === 0 && (
            <p className="mt-6 text-center text-sm text-gray-400">
              표시할 데이터가 없습니다.
            </p>
          )}
        </>
      )}
    </div>
  )
}
