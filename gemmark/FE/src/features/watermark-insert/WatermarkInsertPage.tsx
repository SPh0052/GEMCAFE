import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import VideoListTable, {
  type VideoRow,
} from '@/shared/components/VideoListTable'
import { listVideos, type VideoListItem } from './api'

export default function WatermarkInsert() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<VideoRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listVideos(1, 20)
      .then((res) => {
        // 디버깅용 — 응답 구조 콘솔에서 직접 확인
        console.log('[GET /videos] response:', res)
        if (cancelled) return
        setTotal(res.total)
        setRows(res.items.map(toVideoRow))
      })
      .catch((err) => {
        console.error('[GET /videos] error:', err)
        if (cancelled) return
        setError(
          err?.response?.data?.message ??
            '영상 목록을 불러오지 못했습니다.',
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
      <PageHeader
        title="워터마크 삽입"
        actions={
          <button
            type="button"
            onClick={() => navigate('/insert/new')}
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            워터마크 생성
          </button>
        }
      />

      {/* 디버그 상태 표시 — API 응답 확인용 */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        {loading && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            목록 불러오는 중...
          </span>
        )}
        {!loading && !error && total !== null && (
          <span>
            총 <strong className="text-gray-900">{total}</strong>건
            (이번 페이지 {rows.length}건 표시)
          </span>
        )}
        {error && <span className="text-rose-600">{error}</span>}
      </div>

      <VideoListTable
        rows={rows}
        onRowClick={(row) => {
          // contentUuid 가 있으면 그걸로 상세 조회. 없으면 no(=item.id) fallback.
          const target = row.uuid ?? row.no
          navigate(`/insert/${target}`)
        }}
      />
    </div>
  )
}

function toVideoRow(item: VideoListItem): VideoRow {
  return {
    no: item.id,
    uuid: item.contentUuid,
    name: item.name,
    createdAt: formatDateTime(item.createdAt),
    type: item.type || '-',
    size: formatBytes(item.size),
  }
}

function formatBytes(bytes: number): string {
  if (!bytes && bytes !== 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDateTime(iso: string): string {
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
