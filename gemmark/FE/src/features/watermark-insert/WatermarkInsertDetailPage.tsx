import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Loader2 } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import Thumbnail from '@/shared/components/Thumbnail'
import {
  downloadWatermarkedVideo,
  getVideoDetail,
  triggerBrowserDownload,
  type VideoDetail,
} from './api'

export default function WatermarkInsertDetailPage() {
  // URL의 :id가 곧 백엔드 path의 {uuid} (목록 응답의 item.id 값)
  const { id } = useParams<{ id: string }>()
  const uuid = id ?? ''

  const [detail, setDetail] = useState<VideoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!uuid) {
      setError('잘못된 접근입니다. 영상 ID가 없습니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    getVideoDetail(uuid)
      .then((res) => {
        console.log('[GET /videos/{uuid}] response:', res)
        if (cancelled) return
        setDetail(res)
      })
      .catch((err) => {
        console.error('[GET /videos/{uuid}] error:', err)
        if (cancelled) return
        setError(
          err?.response?.data?.message ??
            '영상 상세 정보를 불러오지 못했습니다.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [uuid])

  const handleDownload = async () => {
    if (!uuid) {
      alert('영상 ID 정보가 없습니다.')
      return
    }
    setDownloading(true)
    try {
      const blob = await downloadWatermarkedVideo(uuid)
      const baseName = (detail?.name ?? 'video').replace(/\.[^.]+$/, '')
      const ext = detail?.name?.match(/\.[^.]+$/)?.[0] ?? '.mp4'
      triggerBrowserDownload(blob, `${baseName}_watermarked${ext}`)
    } catch (err) {
      console.error('다운로드 실패', err)
      alert('다운로드에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="워터마크 삽입 내역" backTo="/insert" />

      {loading && (
        <Card className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm text-gray-500">상세 정보를 불러오는 중...</p>
        </Card>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && detail && (
        <Card className="p-0">
          {/* 결과 헤더 */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Thumbnail className="h-32 w-48" />
              <h3 className="truncate text-base font-bold text-gray-900">
                삽입 결과 — {detail.name}
              </h3>
            </div>
            <Badge tone="success">성공</Badge>
          </div>

          {/* 핵심 메트릭 2개 */}
          <div className="grid grid-cols-2 gap-6 px-6 py-5">
            <div>
              <div className="text-xs text-gray-500">처리 시간</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {detail.processingTime.toFixed(2)}초
              </div>
              <div className="mt-0.5 text-xs text-gray-400">
                {detail.processingFps.toFixed(1)} FPS
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">삽입 PSNR (화질 열화)</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {detail.embedPsnr.toFixed(1)} dB
              </div>
              <div
                className={`mt-0.5 text-xs font-medium ${
                  detail.embedPsnr >= 40
                    ? 'text-emerald-600'
                    : detail.embedPsnr >= 30
                      ? 'text-amber-600'
                      : 'text-rose-600'
                }`}
              >
                {psnrNote(detail.embedPsnr)}
              </div>
            </div>
          </div>

          {/* 페이로드 섹션 */}
          <div className="border-t border-gray-100 px-6 pt-4 pb-1">
            <div className="text-sm font-semibold text-gray-700">
              삽입된 페이로드 ({detail.payloadBits} bit)
            </div>
          </div>

          <dl className="px-6">
            <Row label="사업자 ID" value={detail.businessId} />
            <Row label="콘텐츠 UUID" value={detail.contentUuid} mono />
            <Row
              label="생성 타임스탬프"
              value={formatDateTime(detail.createdAt)}
              mono
            />
            <Row label="워터마크 HEX" value={detail.watermarkHex} mono />
          </dl>

          {/* 다운로드 버튼 */}
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? '다운로드 중...' : '워터마크 영상 다운로드'}
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 py-3 first:border-t-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd
        className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

function psnrNote(psnr: number): string {
  if (psnr >= 40) return '열화 없음'
  if (psnr >= 30) return '열화 미세'
  return '열화 큼'
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
