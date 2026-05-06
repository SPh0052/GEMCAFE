import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Play, RotateCw } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import {
  listRobustnessHistory,
  type RobustnessHistoryItem,
} from './api'

const columns: { label: string }[] = [
  { label: '테스트 ID' },
  { label: '검색 기간 (시작~종료)' },
  { label: '실행 시각' },
  { label: '관리자' },
  { label: '영상 갯수' },
  { label: '성공' },
  { label: '실패' },
]

export default function RobustnessTest() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RobustnessHistoryItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState<number>(0)

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
        setError(
          err?.response?.data?.message ??
            '테스트 이력을 불러오지 못했습니다.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return (
    <div className="space-y-6">
      <PageHeader
        title="강건성 테스트"
        description="포렌식 워터마킹을 위한 편집 강건성 분석."
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

      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-base font-bold text-gray-900">테스트 실행 내역</h2>
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
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-500 transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              목록 업데이트
            </button>
          </div>
        </div>

        {error && (
          <div className="border-y border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-100 bg-gray-50/40 text-left">
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
            {items.map((row) => (
              <tr
                key={row.testId}
                onClick={() => navigate(`/robustness/${row.testId}`)}
                className="cursor-pointer border-b border-gray-100 transition last:border-b-0 hover:bg-gray-50/60"
              >
                <td className="px-6 py-4 text-sm text-gray-700">
                  #{row.testId}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(row.startDate)} ~ {formatDate(row.endDate)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDateTime(row.testDate)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.admin}</td>
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
            ))}
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
