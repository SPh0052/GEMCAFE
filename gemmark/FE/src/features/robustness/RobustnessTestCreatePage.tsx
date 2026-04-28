import { useState } from 'react'
import {
  CheckCircle2,
  Crop,
  FileDown,
  FileVideo,
  Film,
  Filter,
  Loader2,
  Maximize2,
  Play,
  RotateCcw,
  Sun,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import FileDropZone from '@/shared/components/FileDropZone'
import {
  uploadVideo,
  type UploadedVideo,
} from '@/features/watermark-insert/api'
import RadarChart from './components/RadarChart'

type Phase = 'idle' | 'uploading' | 'uploaded' | 'testing' | 'done'

interface AttackRow {
  icon: LucideIcon
  label: string
  param: string
  ber: string
  psnr: string
  status: '통과' | '경고'
}

const mockAttacks: AttackRow[] = [
  {
    icon: Film,
    label: 'H.264 재인코딩',
    param: 'CRF 23',
    ber: '0.02%',
    psnr: '41.2 dB',
    status: '통과',
  },
  {
    icon: Maximize2,
    label: '해상도 축소',
    param: '50% Scale',
    ber: '1.5%',
    psnr: '38.5 dB',
    status: '통과',
  },
  {
    icon: Crop,
    label: '크롭',
    param: 'Center 10%',
    ber: '4.2%',
    psnr: '35.1 dB',
    status: '경고',
  },
  {
    icon: Sun,
    label: '밝기/대비',
    param: '+20% / +10%',
    ber: '0.8%',
    psnr: '44.0 dB',
    status: '통과',
  },
  {
    icon: Waves,
    label: '가우시안 노이즈',
    param: 'Sigma 10',
    ber: '2.1%',
    psnr: '32.8 dB',
    status: '통과',
  },
]

export default function RobustnessTestCreatePage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [video, setVideo] = useState<UploadedVideo | null>(null)
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

  const handleStartTest = () => {
    setPhase('testing')
    setError(null)
    // TODO: 실제 강건성 테스트 API로 교체
    setTimeout(() => setPhase('done'), 3000)
  }

  const handleReset = () => {
    setPhase('idle')
    setVideo(null)
    setError(null)
  }

  const handleExportReport = () => {
    // TODO: 실제 리포트 내보내기 구현
    alert('리포트 내보내기 (구현 예정)')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="강건성 테스트"
        description="포렌식 워터마킹을 위한 편집 강건성 분석."
        actions={
          phase === 'done' ? (
            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <FileDown className="h-4 w-4" />
              리포트 내보내기
            </button>
          ) : null
        }
      />

      {/* 드롭존: idle / uploading */}
      {(phase === 'idle' || phase === 'uploading') && (
        <FileDropZone
          onSelectFile={handleFileSelect}
          disabled={phase === 'uploading'}
          buttonLabel={phase === 'uploading' ? '업로드 중...' : '파일 선택하기'}
        />
      )}

      {/* 업로드 카드: uploaded / testing / done */}
      {(phase === 'uploaded' || phase === 'testing' || phase === 'done') &&
        video && (
          <UploadedVideoCard
            video={video}
            phase={phase}
            onStartTest={handleStartTest}
            onReset={handleReset}
          />
        )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {phase === 'testing' && <TestingCard />}

      {phase === 'done' && (
        <>
          <RobustnessAnalysis />
          <AttackDetailsTable attacks={mockAttacks} />
        </>
      )}
    </div>
  )
}

function UploadedVideoCard({
  video,
  phase,
  onStartTest,
  onReset,
}: {
  video: UploadedVideo
  phase: Phase
  onStartTest: () => void
  onReset: () => void
}) {
  const canStart = phase === 'uploaded'
  const isTesting = phase === 'testing'
  const isDone = phase === 'done'

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
          disabled={isTesting}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" />
          다시 업로드
        </button>
        <button
          type="button"
          onClick={onStartTest}
          disabled={!canStart}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          {isTesting
            ? '테스트 중...'
            : isDone
              ? '테스트 완료'
              : '강건성 테스트 시작하기'}
        </button>
      </div>
    </Card>
  )
}

function TestingCard() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="h-9 w-9 animate-spin text-brand-500" />
      <div>
        <p className="text-base font-semibold text-gray-900">
          강건성 테스트 진행 중...
        </p>
        <p className="mt-1 text-sm text-gray-500">
          여러 공격에 대한 워터마크 검출을 시뮬레이션하고 있습니다.
        </p>
      </div>
    </Card>
  )
}

function RobustnessAnalysis() {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-gray-700">강건성 분석</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-xs font-medium text-gray-500">
            강건성 레이더
          </div>
          <div className="flex h-[260px] items-center justify-center">
            <RadarChart
              values={[0.85, 0.75, 0.6, 0.82, 0.7]}
              labels={['재인코딩', '해상도', '노이즈', '크롭', '밝기']}
              size={260}
            />
          </div>
        </Card>

        <Card>
          <div className="mb-4 text-xs font-medium text-gray-500">요약 지표</div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-6">
              <Metric
                label="평균 BER"
                value="4.8"
                unit="%"
                accentColor="bg-rose-400"
              />
              <Metric
                label="평균 PSNR"
                value="42.3"
                unit="dB"
                accentColor="bg-blue-400"
              />
            </div>
            <div className="grid grid-cols-2 items-end gap-4">
              <div>
                <div className="text-xs text-gray-500">처리 속도</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">28.4</span>
                  <span className="text-sm text-gray-500">FPS</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-brand-50 p-4">
                <div>
                  <div className="text-xs font-medium text-brand-600">
                    종합 점수
                  </div>
                  <div className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-3xl font-bold text-brand-600">
                      87
                    </span>
                    <span className="text-sm text-brand-500">/100</span>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
                  A
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  unit,
  accentColor,
}: {
  label: string
  value: string
  unit: string
  accentColor: string
}) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      <div className={`mt-2 h-1 w-12 rounded-full ${accentColor}`} />
    </div>
  )
}

function AttackDetailsTable({ attacks }: { attacks: AttackRow[] }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="text-sm font-semibold">공격별 상세 결과</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="필터"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="내보내기"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <FileDown className="h-4 w-4" />
          </button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/60 text-left text-xs font-medium tracking-wide text-gray-500">
            <th className="px-6 py-3 font-medium">공격 유형</th>
            <th className="px-6 py-3 font-medium">파라미터</th>
            <th className="px-6 py-3 font-medium">BER</th>
            <th className="px-6 py-3 font-medium">PSNR</th>
            <th className="px-6 py-3 pr-6 text-right font-medium">결과</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {attacks.map((row) => {
            const Icon = row.icon
            return (
              <tr key={row.label}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-gray-800">
                      {row.label}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{row.param}</td>
                <td className="px-6 py-4 text-gray-800">{row.ber}</td>
                <td className="px-6 py-4 text-gray-800">{row.psnr}</td>
                <td className="px-6 py-4 text-right">
                  <Badge
                    tone={row.status === '통과' ? 'success' : 'danger'}
                    dot
                  >
                    {row.status}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
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
