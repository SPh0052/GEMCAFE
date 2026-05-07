import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Loader2, Search } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import { listVerifications, type VerificationListItem } from './api'

type BadgeTone = 'success' | 'danger' | 'info' | 'neutral'

interface BadgeInfo {
  tone: BadgeTone
  label: string
}

/**
 * BE가 status에 어떤 enum 문자열을 내려주는지 확실치 않아서
 * 키워드 기반으로 매핑. (DETECTED / NOT_DETECTED / PROCESSING 패턴 가정)
 */
function mapStatus(raw: string): BadgeInfo {
  const s = raw?.toUpperCase() ?? ''
  if (s.includes('NOT')) return { tone: 'danger', label: 'Not Detected' }
  if (s.includes('PROCESS') || s.includes('PEND'))
    return { tone: 'info', label: 'Processing' }
  if (s.includes('FAIL') || s.includes('ERROR'))
    return { tone: 'danger', label: 'Failed' }
  if (s.includes('DETECT') || s.includes('VERIFI') || s.includes('SUCCESS'))
    return { tone: 'success', label: 'Detected' }
  return { tone: 'neutral', label: raw || '-' }
}

export default function WatermarkDetect() {
  const navigate = useNavigate()
  const [items, setItems] = useState<VerificationListItem[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    listVerifications(1, 20)
      .then((res) => {
        console.log('[GET /verifications] response:', res)
        if (cancelled) return
        setTotal(res.total)
        setItems(res.items)
      })
      .catch((err) => {
        console.error('[GET /verifications] error:', err)
        if (cancelled) return
        setError(
          err?.response?.data?.message ??
            '검증 이력을 불러오지 못했습니다.',
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

      {/* 디버그 상태 표시 */}
      <div className="flex items-center gap-3 text-sm text-gray-600">
        {loading && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            검증 이력 불러오는 중...
          </span>
        )}
        {!loading && !error && total !== null && (
          <span>
            총 <strong className="text-gray-900">{total}</strong>건
            (이번 페이지 {items.length}건 표시)
          </span>
        )}
        {error && <span className="text-rose-600">{error}</span>}
      </div>

      <VerificationTable items={items} loading={loading} />
    </div>
  )
}

function VerificationTable({
  items,
  loading,
}: {
  items: VerificationListItem[]
  loading: boolean
}) {
  const navigate = useNavigate()

  return (
    <Card className="p-0">
      <div className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-medium tracking-wide text-gray-500">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">VERIFICATION ID</th>
              <th className="px-5 py-3 font-medium">STATUS</th>
              <th className="px-5 py-3 font-medium">ASSET</th>
              <th className="px-5 py-3 font-medium">REQUESTED AT</th>
              <th className="px-5 py-3 font-medium">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-sm text-gray-400"
                >
                  검증 이력이 없습니다.
                </td>
              </tr>
            )}
            {items.map((row, i) => {
              const s = mapStatus(row.status)
              return (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/detect/${row.id}`)}
                  className="cursor-pointer transition hover:bg-gray-50/60"
                >
                  <td className="px-5 py-4 text-gray-500">
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-brand-500">
                    #{row.id}
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {row.thumbnailUrl ? (
                        <img
                          src={row.thumbnailUrl}
                          alt=""
                          className="h-10 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-16 rounded-lg bg-linear-to-br from-gray-100 to-gray-200" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm text-gray-800">
                          {row.originalFileName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatBytes(row.fileSize)}
                          {row.durationSec
                            ? ` · ${formatDuration(row.durationSec)}`
                            : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      aria-label="상세 보기"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/detect/${row.id}`)
                      }}
                      className="text-gray-400 hover:text-brand-500"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function formatBytes(bytes: number): string {
  if (!bytes && bytes !== 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
      second: '2-digit',
    })
  } catch {
    return iso
  }
}
