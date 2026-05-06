import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, Loader2, Play } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import {
  listRobustnessVideos,
  runRobustnessTest,
  type RobustnessVideoItem,
} from './api'

const columns: { label: string }[] = [
  { label: '영상 파일명' },
  { label: '생성 일자' },
  { label: '크기' },
  { label: '형식' },
]

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export default function RobustnessTestCreatePage() {
  const navigate = useNavigate()

  // 기본값: 최근 30일
  const [startAt, setStartAt] = useState<string>(() => daysAgoISO(30))
  const [endAt, setEndAt] = useState<string>(() => todayISO())

  const [videos, setVideos] = useState<RobustnessVideoItem[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [startError, setStartError] = useState<string | null>(null)

  // 기간 변경 시 자동으로 필터링된 목록 재조회 (300ms 디바운스)
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      setLoading(true)
      setError(null)
      listRobustnessVideos({
        page: 1,
        size: 20,
        startDate: startAt || undefined,
        endDate: endAt || undefined,
      })
        .then((res) => {
          console.log('[GET /robustness] response:', res)
          if (cancelled) return
          setVideos(res.items)
          setTotal(res.total)
        })
        .catch((err) => {
          console.error('[GET /robustness] error:', err)
          if (cancelled) return
          setError(
            err?.response?.data?.message ??
              '영상 목록을 불러오지 못했습니다.',
          )
          setVideos([])
          setTotal(null)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [startAt, endAt])

  const handleStart = () => {
    if (!startAt || !endAt) {
      setStartError('테스트 기간을 모두 선택해주세요.')
      return
    }
    if (videos.length === 0) {
      setStartError('해당 기간에 테스트할 영상이 없습니다.')
      return
    }
    setStartError(null)

    // Fire-and-forget — BE 가 테스트를 백그라운드에서 처리하므로 응답을 기다리지 않음.
    // 사용자는 즉시 목록 페이지로 이동, 새 테스트가 이력 상단에 표시됨.
    // (응답/에러는 콘솔에만 남김 — 필요시 토스트 시스템 추가 검토)
    runRobustnessTest({ startDate: startAt, endDate: endAt })
      .then((res) => console.log('[POST /robustness/run] response:', res))
      .catch((err) => console.error('[POST /robustness/run] error:', err))

    navigate('/robustness')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="강건성 테스트" backTo="/robustness" />

      {/* 기간 설정 + 테스트 시작 */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">테스트 기간 설정</span>
        <input
          type="date"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none"
        />
        <span className="text-gray-400">-</span>
        <input
          type="date"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleStart}
          disabled={videos.length === 0 || !startAt || !endAt}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          테스트 시작
        </button>
      </div>

      {/* 테스트 시작 실패 시 에러 */}
      {startError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {startError}
        </div>
      )}

      {/* 디버그 상태 */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        {loading && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            영상 목록 불러오는 중...
          </span>
        )}
        {!loading && !error && total !== null && (
          <span>
            총 <strong className="text-gray-900">{total}</strong>건
            (이번 페이지 {videos.length}건 표시)
          </span>
        )}
        {error && <span className="text-rose-600">{error}</span>}
      </div>

      {/* 영상 목록 테이블 */}
      <div className="rounded-2xl bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40 text-left">
              {columns.map((col) => (
                <th key={col.label} className="px-6 py-3.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800 transition hover:text-brand-600"
                  >
                    <span>{col.label}</span>
                    <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && videos.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  해당 기간에 조회된 영상이 없습니다.
                </td>
              </tr>
            )}
            {videos.map((video) => (
              <tr
                key={video.id}
                className="border-b border-gray-100 last:border-b-0 transition hover:bg-gray-50/60"
              >
                <td className="px-6 py-4 text-sm text-gray-800">{video.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDateTime(video.createdAt)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatBytes(video.size)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {video.type || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatBytes(bytes?: number): string {
  if (bytes == null) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

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
