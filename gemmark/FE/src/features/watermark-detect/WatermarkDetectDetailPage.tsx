import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import VerificationResultCard from './components/VerificationResultCard'
import ExtractedWatermarkCard, {
  type ExtractedField,
} from './components/ExtractedWatermarkCard'
import { getVerificationDetail, type VerificationDetail } from './api'

export default function WatermarkDetectDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [detail, setDetail] = useState<VerificationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('잘못된 접근입니다. 검증 ID가 없습니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    getVerificationDetail(id)
      .then((res) => {
        console.log('[GET /verifications/{id}] response:', res)
        if (cancelled) return
        setDetail(res)
      })
      .catch((err) => {
        console.error('[GET /verifications/{id}] error:', err)
        if (cancelled) return
        setError(
          err?.response?.data?.message ??
            '검증 상세 정보를 불러오지 못했습니다.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return (
    <div className="space-y-6">
      <PageHeader title="워터마크 검증 내역" backTo="/detect" />

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
        <>
          <VerificationResultCard
            fileName={detail.originalFileName}
            verified={isDetected(detail.status)}
            thumbnailUrl={detail.thumbnailUrl}
          />

          <ExtractedWatermarkCard fields={mapExtractedFields(detail)} />

          <EmbeddingMetaCard detail={detail} />
        </>
      )}
    </div>
  )
}

function isDetected(status: string): boolean {
  const s = status?.toUpperCase() ?? ''
  return (
    (s.includes('DETECT') || s.includes('VERIFI') || s.includes('SUCCESS')) &&
    !s.includes('NOT')
  )
}

function mapExtractedFields(d: VerificationDetail): ExtractedField[] {
  return [
    { name: 'Content UUID', value: d.contentUuid || '-', ok: !!d.contentUuid },
    { name: 'Business ID', value: d.businessId || '-', ok: !!d.businessId },
    {
      name: 'Watermark HEX',
      value: d.watermarkHex || '-',
      ok: !!d.watermarkHex,
    },
    {
      name: 'Payload Bits',
      value: d.payloadBits ? `${d.payloadBits} bit` : '-',
      ok: d.payloadBits > 0,
    },
    {
      name: 'Embedded At',
      value: formatDateTime(d.embeddedAt),
      ok: !!d.embeddedAt,
    },
    {
      name: 'Accuracy',
      value: d.accuracy != null ? `${(d.accuracy * 100).toFixed(2)}%` : '-',
      ok: d.accuracy >= 0.95,
    },
  ]
}

/**
 * 검증 + 삽입 단계의 메타데이터 카드. 강도(α) / PSNR / 처리 속도 / 추출 시간 등.
 */
function EmbeddingMetaCard({ detail }: { detail: VerificationDetail }) {
  return (
    <Card className="p-0">
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="text-base font-bold text-gray-900">메타데이터</h3>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5 md:grid-cols-3">
        <Metric
          label="추출 소요 시간"
          value={
            detail.extractDuration != null
              ? `${detail.extractDuration.toFixed(2)}초`
              : '-'
          }
        />
        <Metric
          label="삽입 PSNR"
          value={
            detail.embedPsnr != null ? `${detail.embedPsnr.toFixed(1)} dB` : '-'
          }
        />
        <Metric label="알파 (α)" value={String(detail.alpha ?? '-')} />
        <Metric
          label="삽입 처리 시간"
          value={
            detail.embedProcessingTime != null
              ? `${detail.embedProcessingTime.toFixed(2)}초`
              : '-'
          }
        />
        <Metric
          label="삽입 FPS"
          value={
            detail.embedProcessingFps != null
              ? `${detail.embedProcessingFps.toFixed(1)} FPS`
              : '-'
          }
        />
        <Metric
          label="파일 크기 / 길이"
          value={`${formatBytes(detail.fileSize)} · ${formatDuration(detail.durationSec)}`}
        />
      </div>

      <dl className="border-t border-gray-100 px-6 pb-2">
        <Row label="원본 파일명" value={detail.originalFileName || '-'} />
        <Row label="저장 파일명" value={detail.storedFileName || '-'} mono />
        <Row label="파일 타입" value={detail.fileType || '-'} />
        <Row label="검증 요청 시각" value={formatDateTime(detail.createdAt)} />
      </dl>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-base font-bold text-gray-900">{value}</div>
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
        className={`max-w-[60%] truncate text-sm font-semibold text-gray-900 ${
          mono ? 'font-mono' : ''
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
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
  if (!seconds && seconds !== 0) return '-'
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
