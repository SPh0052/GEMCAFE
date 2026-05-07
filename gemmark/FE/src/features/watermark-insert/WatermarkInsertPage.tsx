import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import VideoListTable, {
  type VideoRow,
} from '@/shared/components/VideoListTable'
import Pagination from '@/shared/components/Pagination'
import { extractErrorMessage } from '@/shared/lib/errors'
import { listVideos, type VideoListItem } from './api'

const PAGE_SIZE = 20

export default function WatermarkInsert() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // URL을 단일 진실 원천(single source of truth)으로 사용
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [rows, setRows] = useState<VideoRow[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listVideos({ page, size: PAGE_SIZE })
      .then((res) => {
        console.log('[GET /videos] response:', res)
        if (cancelled) return
        setTotal(res.total)
        setRows(res.items.map(toVideoRow))
      })
      .catch((err) => {
        console.error('[GET /videos] error:', err)
        if (cancelled) return
        setError(extractErrorMessage(err, '영상 목록을 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page])

  const handlePageChange = (newPage: number) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (newPage === 1) params.delete('page')
        else params.set('page', String(newPage))
        return params
      },
      { replace: false },
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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
            총 <strong className="text-gray-900">{total}</strong>건
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

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onChange={handlePageChange}
        />
      )}
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
    thumbnailUrl: item.thumbnailUrl ?? undefined,
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
