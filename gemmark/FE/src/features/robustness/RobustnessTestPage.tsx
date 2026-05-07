import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Play } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Badge from '@/shared/components/Badge'
import { extractErrorMessage } from '@/shared/lib/errors'
import {
  listRobustnessHistory,
  type RobustnessHistoryItem,
} from './api'

const columns: { label: string }[] = [
  { label: '검색 기간 (시작~종료)' },
  { label: '실행 시각' },
  { label: '관리자' },
  { label: '상태' },
  { label: '영상 갯수' },
  { label: '성공' },
  { label: '실패' },
]

/**
 * 처리된 영상 수(success + fail)가 전체와 같으면 완료, 아니면 진행 중.
 * BE 가 별도 status 필드를 안 주므로 카운트 비교로 추론.
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

export default function RobustnessTest() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RobustnessHistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listRobustnessHistory()
      .then((res) => {
        console.log('[GET /robustness/history] response:', res)
        if (cancelled) return
        setItems(res)
      })
      .catch((err) => {
        console.error('[GET /robustness/history] error:', err)
        if (cancelled) return
        setError(extractErrorMessage(err, '테스트 이력을 불러오지 못했습니다.'))
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
      <PageHeader
        title="강건성 테스트"
        actions={
          <button
            type="button"
            onClick={() => navigate('/robustness/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            <Play className="h-4 w-4" />
            테스트 시작
          </button>
        }
      />

      {/* 상태 표시 */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        {loading && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            불러오는 중...
          </span>
        )}
        {!loading && !error && (
          <span>
            총 <strong className="text-gray-900">{items.length}</strong>건
          </span>
        )}
        {error && <span className="text-rose-600">{error}</span>}
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40 text-left">
              {columns.map((col) => (
                <th
                  key={col.label}
                  className="px-6 py-3.5 text-sm font-semibold text-gray-800"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && !error && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-gray-400"
                >
                  강건성 테스트 이력이 없습니다.
                </td>
              </tr>
            )}
            {items.map((row) => {
              const status = deriveStatus(row)
              return (
                <tr
                  key={row.testId}
                  onClick={() => navigate(`/robustness/${row.testId}`)}
                  className="cursor-pointer border-b border-gray-100 transition last:border-b-0 hover:bg-gray-50/60"
                >
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(row.startDate)} ~ {formatDate(row.endDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDateTime(row.testDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {row.admin}
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {row.totalCount}
                  </td>
                  <td className="px-6 py-4 text-sm text-emerald-600">
                    {row.successCount}
                  </td>
                  <td
                    className={`px-6 py-4 text-sm font-medium ${
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
      </div>
    </div>
  )
}

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' (날짜만, 시간 없음) */
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
