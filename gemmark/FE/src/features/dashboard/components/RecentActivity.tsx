import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2 } from 'lucide-react'
import Badge from '@/shared/components/Badge'
import { extractErrorMessage } from '@/shared/lib/errors'
import {
  listRobustnessHistory,
  type RobustnessHistoryItem,
} from '@/features/robustness/api'

const ROW_LIMIT = 5

/**
 * 처리된 영상 수(success + fail)가 전체와 같으면 완료, 아니면 진행 중.
 * RobustnessTestPage 와 동일한 로직.
 */
function deriveStatus(row: RobustnessHistoryItem): {
  tone: 'success' | 'warning'
  label: string
} {
  const processed = row.successCount + row.failCount
  return processed === row.totalCount
    ? { tone: 'success', label: '완료' }
    : { tone: 'warning', label: '진행 중' }
}

export default function RecentActivity() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RobustnessHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listRobustnessHistory()
      .then((res) => {
        if (cancelled) return
        // 최신 testDate 내림차순 정렬 → 상위 N건만
        const sorted = [...res].sort((a, b) =>
          (b.testDate ?? '').localeCompare(a.testDate ?? ''),
        )
        setItems(sorted.slice(0, ROW_LIMIT))
      })
      .catch((err) => {
        console.error('[GET /robustness/history] error:', err)
        if (cancelled) return
        setError(
          extractErrorMessage(err, '최근 테스트 내역을 불러오지 못했습니다.'),
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
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          최근 강건성 테스트 내역
        </h2>
        <button
          type="button"
          onClick={() => navigate('/robustness')}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline"
        >
          전체 보기
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-1.5 py-8 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
          불러오는 중...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">
          최근 강건성 테스트가 없습니다.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
              <th className="py-3 pr-4 font-medium">검색 기간</th>
              <th className="py-3 pr-4 font-medium">실행 시각</th>
              <th className="py-3 pr-4 font-medium">관리자</th>
              <th className="py-3 pr-4 font-medium">상태</th>
              <th className="py-3 pr-4 font-medium">영상 갯수</th>
              <th className="py-3 pr-4 font-medium">성공</th>
              <th className="py-3 pr-4 font-medium">실패</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const status = deriveStatus(row)
              return (
                <tr
                  key={row.testId}
                  onClick={() => navigate(`/robustness/${row.testId}`)}
                  className="cursor-pointer border-b border-gray-100 last:border-b-0 transition hover:bg-gray-50/60"
                >
                  <td className="py-4 pr-4 text-sm text-gray-500">
                    {formatDate(row.startDate)} ~ {formatDate(row.endDate)}
                  </td>
                  <td className="py-4 pr-4 text-sm text-gray-500">
                    {formatDateTime(row.testDate)}
                  </td>
                  <td className="py-4 pr-4 text-sm text-gray-700">
                    {row.admin}
                  </td>
                  <td className="py-4 pr-4">
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4 text-sm text-gray-700">
                    {row.totalCount}
                  </td>
                  <td className="py-4 pr-4 text-sm text-emerald-600">
                    {row.successCount}
                  </td>
                  <td
                    className={`py-4 pr-4 text-sm font-medium ${
                      row.failCount > 0 ? 'text-rose-600' : 'text-gray-400'
                    }`}
                  >
                    {row.failCount}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
function formatDate(ymd?: string): string {
  if (!ymd) return '-'
  return ymd.replaceAll('-', '.')
}

/** ISO datetime → 한국어 로케일 'YYYY.MM.DD HH:mm' */
function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
