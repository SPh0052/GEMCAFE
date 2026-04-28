import { useState } from 'react'
import {
  CheckCircle2,
  Download,
  FileVideo,
  Loader2,
  RotateCcw,
  RotateCw,
  Sparkles,
} from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import FileDropZone from '@/shared/components/FileDropZone'
import {
  embedWatermark,
  uploadVideo,
  type EmbedResult,
  type UploadedVideo,
} from './api'

type Phase = 'idle' | 'uploading' | 'uploaded' | 'processing' | 'done'

export default function WatermarkInsertCreatePage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [video, setVideo] = useState<UploadedVideo | null>(null)
  const [embedResult, setEmbedResult] = useState<EmbedResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    setPhase('uploading')
    setError(null)
    try {
      const uploaded = await uploadVideo(file)
      setVideo(uploaded)
      setPhase('uploaded')
    } catch (err) {
      console.error('업로드 실패', err)
      setError('업로드에 실패했습니다. 파일과 네트워크를 확인해주세요.')
      setPhase('idle')
    }
  }

  const handleStartWatermark = async () => {
    if (!video) return
    setPhase('processing')
    setError(null)
    try {
      const result = await embedWatermark(video.videoId)
      setEmbedResult(result)
      setPhase('done')
    } catch (err) {
      console.error('워터마크 삽입 실패', err)
      setError('워터마크 삽입에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setPhase('uploaded')
    }
  }

  const handleReset = () => {
    setPhase('idle')
    setVideo(null)
    setEmbedResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="워터마크 삽입"
        actions={
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            워터마크 생성
          </button>
        }
      />

      {/* 업로드 영역 */}
      {(phase === 'idle' || phase === 'uploading') && (
        <FileDropZone
          onSelectFile={handleFileSelect}
          disabled={phase === 'uploading'}
          buttonLabel={phase === 'uploading' ? '업로드 중...' : '파일 선택하기'}
        />
      )}

      {(phase === 'uploaded' ||
        phase === 'processing' ||
        phase === 'done') &&
        video && (
          <UploadedVideoCard
            video={video}
            phase={phase}
            onStartWatermark={handleStartWatermark}
            onReset={handleReset}
          />
        )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            생성된 영상 목록
          </h2>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:underline"
          >
            <RotateCw className="h-3.5 w-3.5" />
            목록 업데이트
          </button>
        </div>

        {(phase === 'idle' ||
          phase === 'uploading' ||
          phase === 'uploaded') && <EmptyState />}
        {phase === 'processing' && <ProcessingCard />}
        {phase === 'done' && embedResult && video && (
          <ResultCard result={embedResult} fileName={video.originalFilename} />
        )}
      </section>
    </div>
  )
}

function UploadedVideoCard({
  video,
  phase,
  onStartWatermark,
  onReset,
}: {
  video: UploadedVideo
  phase: Phase
  onStartWatermark: () => void
  onReset: () => void
}) {
  const canStart = phase === 'uploaded'

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
          <FileVideo className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900">
              {video.originalFilename}
            </h3>
            <Badge tone="success" dot>
              <CheckCircle2 className="mr-0.5 h-3 w-3" />
              업로드 완료
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{formatBytes(video.fileSize)}</span>
            <span>·</span>
            <span>{video.mimeType}</span>
            <span>·</span>
            <span>업로드: {formatDateTime(video.uploadedAt)}</span>
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            videoId: <span className="font-mono">{video.videoId}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={phase === 'processing'}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" />
          다시 업로드
        </button>
        <button
          type="button"
          onClick={onStartWatermark}
          disabled={!canStart}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {phase === 'processing' ? '삽입 중...' : '워터마크 삽입'}
        </button>
      </div>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card className="flex items-center justify-center py-12 text-center">
      <p className="text-sm text-gray-400">
        파일을 업로드하고 "워터마크 삽입"을 눌러 진행하세요.
      </p>
    </Card>
  )
}

function ProcessingCard() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
      <div>
        <p className="text-base font-semibold text-gray-900">
          워터마크 삽입 중...
        </p>
        <p className="mt-1 text-sm text-gray-500">
          잠시만 기다려 주세요. 영상 길이에 따라 시간이 다를 수 있습니다.
        </p>
      </div>
    </Card>
  )
}

function ResultCard({
  result,
  fileName,
}: {
  result: EmbedResult
  fileName: string
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="text-base font-bold text-gray-900">
          삽입 결과 — {fileName}
        </h3>
        <Badge tone={result.success ? 'success' : 'danger'}>
          {result.success ? '성공' : '실패'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-6 px-6 py-5">
        <div>
          <div className="text-xs text-gray-500">처리 시간</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {result.processingTime.toFixed(2)}초
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">삽입 PSNR (화질 열화)</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {result.psnr.toFixed(1)} dB
          </div>
          <div
            className={`mt-0.5 text-xs font-medium ${
              result.psnr >= 40 ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {psnrNote(result.psnr)}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-6 pt-4 pb-1">
        <div className="text-sm font-semibold text-gray-700">
          삽입된 페이로드
        </div>
      </div>

      <dl className="px-6">
        <Row label="콘텐츠 UUID" value={result.contentUuid} mono />
        <Row label="생성 타임스탬프" value={formatDateTime(result.timestamp)} />
        <Row label="워터마크 HEX" value={result.watermarkHex} mono />
      </dl>

      <div className="border-t border-gray-100 px-6 py-4">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          <Download className="h-4 w-4" />
          워터마크 영상 다운로드
        </button>
      </div>
    </Card>
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDateTime(iso: string): string {
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
