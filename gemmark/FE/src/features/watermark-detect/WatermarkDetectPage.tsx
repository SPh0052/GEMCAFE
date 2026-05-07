import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import VideoListTable, {
  type VideoRow,
} from '@/shared/components/VideoListTable'
import Pagination from '@/shared/components/Pagination'
import { extractErrorMessage } from '@/shared/lib/errors'
import { listVerifications, type VerificationListItem } from './api'

const PAGE_SIZE = 20

export default function WatermarkDetect() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [rows, setRows] = useState<VideoRow[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listVerifications({ page, size: PAGE_SIZE })
      .then((res) => {
        console.log('[GET /verifications] response:', res)
        if (cancelled) return
        setTotal(res.total)
        setRows(res.items.map(toVideoRow))
      })
      .catch((err) => {
        console.error('[GET /verifications] error:', err)
        if (cancelled) return
        setError(extractErrorMessage(err, '검증 이력을 불러오지 못했습니다.'))
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
        title="워터마크 검증"
        actions={
          <button
            type="button"
            onClick={() => navigate('/detect/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            <Search className="h-4 w-4" />
            워터마크 검출
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
        onRowClick={(row) => navigate(`/detect/${row.no}`)}
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

function toVideoRow(item: VerificationListItem): VideoRow {
  return {
    no: item.id,
    name: item.originalFileName,
    createdAt: formatDateTime(item.createdAt),
    type: extractFileType(item.originalFileName),
    size: formatBytes(item.fileSize),
    thumbnailUrl: item.thumbnailUrl || undefined,
  }
}

/** 파일명 확장자에서 type 표기 추출 (예: 'a.mp4' → 'MP4 Video'). */
function extractFileType(fileName: string): string {
  const ext = fileName.match(/\.([^.]+)$/)?.[1]?.toUpperCase()
  if (!ext) return '-'
  if (['MP4', 'MOV', 'AVI', 'MKV', 'WEBM'].includes(ext)) return `${ext} Video`
  if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(ext)) return `${ext} Image`
  return ext
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
