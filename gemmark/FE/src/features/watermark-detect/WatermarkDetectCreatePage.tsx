import { useState } from 'react'
import {
  CheckCircle2,
  FileVideo,
  Loader2,
  RotateCcw,
  Search,
} from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import FileDropZone from '@/shared/components/FileDropZone'
import VerificationResultCard from './components/VerificationResultCard'
import ExtractedWatermarkCard from './components/ExtractedWatermarkCard'
import { verifyWatermark, type VerifyResult } from './api'

type Phase = 'idle' | 'selected' | 'verifying' | 'done'

interface LocalFile {
  raw: File
  name: string
  size: number
  type: string
  selectedAt: string
}

export default function WatermarkDetectCreatePage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [localFile, setLocalFile] = useState<LocalFile | null>(null)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (file: File) => {
    setLocalFile({
      raw: file,
      name: file.name,
      size: file.size,
      type: file.type || 'video/mp4',
      selectedAt: new Date().toISOString(),
    })
    setPhase('selected')
    setError(null)
  }

  const handleStartVerify = async () => {
    if (!localFile) return
    setPhase('verifying')
    setError(null)
    try {
      const verified = await verifyWatermark(localFile.raw)
      setResult(verified)
      setPhase('done')
    } catch (err) {
      console.error('워터마크 검증 실패', err)
      setError('워터마크 검증에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setPhase('selected')
    }
  }

  const handleReset = () => {
    setPhase('idle')
    setLocalFile(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="워터마크 검증" />

      {/* 드롭존: idle 일 때만 */}
      {phase === 'idle' && <FileDropZone onSelectFile={handleFileSelect} />}

      {/* 업로드 카드: 파일 선택 후 계속 표시 */}
      {(phase === 'selected' ||
        phase === 'verifying' ||
        phase === 'done') &&
        localFile && (
          <SelectedFileCard
            file={localFile}
            phase={phase}
            onStartVerify={handleStartVerify}
            onReset={handleReset}
          />
        )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {phase === 'verifying' && <DetectingCard />}

      {phase === 'done' && result && localFile && (
        <>
          <VerificationResultCard
            fileName={localFile.name}
            verified={result.isWatermarked}
          />

          {result.isWatermarked && (
            <ExtractedWatermarkCard fields={mapToFields(result)} />
          )}
        </>
      )}
    </div>
  )
}

function SelectedFileCard({
  file,
  phase,
  onStartVerify,
  onReset,
}: {
  file: LocalFile
  phase: Phase
  onStartVerify: () => void
  onReset: () => void
}) {
  const canStart = phase === 'selected'
  const isVerifying = phase === 'verifying'

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
          <FileVideo className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900">
              {file.name}
            </h3>
            <Badge tone="success" dot>
              <CheckCircle2 className="mr-0.5 h-3 w-3" />
              업로드 완료
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{formatBytes(file.size)}</span>
            <span>·</span>
            <span>{file.type}</span>
            <span>·</span>
            <span>업로드: {formatDateTime(file.selectedAt)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={isVerifying}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" />
          다시 업로드
        </button>
        <button
          type="button"
          onClick={onStartVerify}
          disabled={!canStart}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {isVerifying ? '검증 중...' : '워터마크 검증'}
        </button>
      </div>
    </Card>
  )
}

function DetectingCard() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="h-9 w-9 animate-spin text-brand-500" />
      <div>
        <p className="text-base font-semibold text-gray-900">
          워터마크 검증 중...
        </p>
        <p className="mt-1 text-sm text-gray-500">
          영상에서 워터마크를 추출하고 있습니다.
        </p>
      </div>
    </Card>
  )
}

function mapToFields(result: VerifyResult) {
  return [
    { name: 'UUID', value: result.videoUuid || '-', ok: true },
    { name: 'Business ID', value: result.businessId || '-', ok: true },
    {
      name: 'Created At',
      value: formatDateTime(result.createdAt),
      ok: true,
    },
    {
      name: 'BER',
      value: `${(result.ber * 100).toFixed(2)}%`,
      ok: result.ber < 0.05,
    },
  ]
}

function formatBytes(bytes: number): string {
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
      second: '2-digit',
    })
  } catch {
    return iso
  }
}
