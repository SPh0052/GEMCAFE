import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  CheckCircle2,
  Crop,
  FileDown,
  Film,
  Filter,
  FlipHorizontal,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Sun,
  Waves,
  XCircle,
} from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import RadarChart from './components/RadarChart'
import {
  getRobustnessVideoAttacks,
  getRobustnessVideoInfo,
  type RobustnessAttackResult,
  type RobustnessVideoAttacks,
  type RobustnessVideoInfo,
} from './api'

export default function RobustnessFailedVideoPage() {
  const { id, videoId } = useParams<{ id: string; videoId: string }>()

  const [info, setInfo] = useState<RobustnessVideoInfo | null>(null)
  const [attacks, setAttacks] = useState<RobustnessVideoAttacks | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !videoId) {
      setError('잘못된 접근입니다. 테스트/영상 ID 가 없습니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      getRobustnessVideoInfo(id, videoId),
      getRobustnessVideoAttacks(id, videoId),
    ])
      .then(([infoRes, attacksRes]) => {
        console.log('[GET /robustness/tests/.../videos/...] info:', infoRes)
        console.log(
          '[GET /robustness/tests/.../videos/.../attacks] attacks:',
          attacksRes,
        )
        if (cancelled) return
        setInfo(infoRes)
        setAttacks(attacksRes)
      })
      .catch((err) => {
        console.error('[failed video detail] error:', err)
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
  }, [id, videoId])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="강건성 분석 상세 보고서"
          backTo={`/robustness/${id ?? ''}`}
          backLabel="테스트 요약으로"
        />
        <Card className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm text-gray-500">상세 정보를 불러오는 중...</p>
        </Card>
      </div>
    )
  }
  if (error || !info || !attacks) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="강건성 분석 상세 보고서"
          backTo={`/robustness/${id ?? ''}`}
          backLabel="테스트 요약으로"
        />
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error ?? '데이터가 없습니다.'}
        </div>
      </div>
    )
  }

  const isPassed = isTestPassed(info.testPassed)

  return (
    <div className="space-y-6">
      <PageHeader
        title="강건성 분석 상세 보고서"
        backTo={`/robustness/${id ?? ''}`}
        backLabel="테스트 요약으로"
      />

      <Card>
        <dl className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
          <InfoRow label="영상 파일명" value={info.videoFileName} />
          <InfoRow
            label="테스트 실시 일자"
            value={formatDateTime(info.testDate)}
          />
          <InfoRow label="영상 ID (VideoId)" value={info.videoUuid} />
          <InfoRow label="영상 크기" value={formatBytes(info.fileSize)} />
          <InfoRow
            label="영상 생성 일자"
            value={formatDateTime(info.createDate)}
          />
          <InfoRow
            label="테스트 상태"
            value={
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-900">
                {isPassed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-500" />
                )}
                {isPassed ? '통과' : '실패'}
              </span>
            }
          />
          <InfoRow label="담당 분석가" value={info.adminId} />
        </dl>
      </Card>

      <RobustnessAnalysisSection attacks={attacks} />
      <AttackDetailsTable attacks={attacks.attacks} />
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-baseline gap-4">
      <dt className="w-32 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="flex-1 text-sm text-gray-900">{value}</dd>
    </div>
  )
}

function RobustnessAnalysisSection({
  attacks,
}: {
  attacks: RobustnessVideoAttacks
}) {
  // 레이더 차트 — 각 공격의 PSNR 을 [0,1] 로 정규화 (20dB → 0, 45dB → 1)
  const radarValues = attacks.attacks.map((a) =>
    Math.max(0, Math.min(1, (a.psnr - 20) / 25)),
  )
  const radarLabels = attacks.attacks.map((a) => shortAttackLabel(a.type))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <div className="mb-3 text-sm font-semibold text-gray-800">
          강건성 레이더
        </div>
        <div className="flex h-65 items-center justify-center">
          {radarValues.length >= 3 ? (
            <RadarChart values={radarValues} labels={radarLabels} size={260} />
          ) : (
            <p className="text-sm text-gray-400">
              레이더 표시에 필요한 공격 데이터가 부족합니다.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 text-sm font-semibold text-gray-800">요약 지표</div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <Metric
              label="평균 BER"
              value={attacks.avgBer.toFixed(2)}
              unit="%"
              accentColor="bg-rose-400"
            />
            <Metric
              label="평균 PSNR"
              value={attacks.avgPsnr.toFixed(1)}
              unit="dB"
              accentColor="bg-blue-400"
            />
          </div>
          <div>
            <div className="text-xs text-gray-500">평균 처리 시간</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">
                {attacks.avgDuration.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">초</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
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

function AttackDetailsTable({
  attacks,
}: {
  attacks: RobustnessAttackResult[]
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900">공격 유형</h3>
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
            <th className="px-6 py-3 font-medium">BER</th>
            <th className="px-6 py-3 font-medium">PSNR</th>
            <th className="px-6 py-3 font-medium">처리 시간</th>
            <th className="px-6 py-3 pr-6 text-right font-medium">결과</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {attacks.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-10 text-center text-sm text-gray-400"
              >
                공격 결과 데이터가 없습니다.
              </td>
            </tr>
          )}
          {attacks.map((row) => {
            const Icon = attackIcon(row.type)
            const status = attackStatus(row.ber)
            return (
              <tr key={row.type}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-gray-800">
                      {row.type}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-800">
                  {row.ber.toFixed(2)}%
                </td>
                <td className="px-6 py-4 text-gray-800">
                  {row.psnr.toFixed(1)} dB
                </td>
                <td className="px-6 py-4 text-gray-800">
                  {row.duration.toFixed(2)}초
                </td>
                <td className="px-6 py-4 text-right">
                  <Badge tone={status.tone} dot>
                    {status.label}
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

/* ───── 헬퍼 ───── */

function isTestPassed(testPassed: string): boolean {
  const v = (testPassed ?? '').toUpperCase()
  return v === 'SUCCESS' || v === 'PASS' || v === 'PASSED'
}

/** BE 가 'SUCCESS'/'FAILED' 등 enum 줘서 화면 표시. 통과 여부는 isTestPassed 로 분리 판정. */
// (현재는 isTestPassed 직접 사용 — 별도 라벨 함수 불필요)

/** BER 값 기준으로 통과/경고/실패 판정. */
function attackStatus(
  ber: number,
): { tone: 'success' | 'warning' | 'danger'; label: string } {
  if (ber <= 1) return { tone: 'success', label: '통과' }
  if (ber <= 5) return { tone: 'warning', label: '경고' }
  return { tone: 'danger', label: '실패' }
}

/** 공격 type 문자열 → 매칭 lucide 아이콘. 매칭 없으면 fallback. */
function attackIcon(type: string): LucideIcon {
  const t = (type ?? '').toLowerCase()
  if (t.includes('h.264') || t.includes('재인코딩') || t.includes('avc'))
    return Film
  if (t.includes('jpeg') || t.includes('압축')) return ImageIcon
  if (t.includes('해상도') || t.includes('scale')) return Maximize2
  if (t.includes('크롭') || t.includes('crop')) return Crop
  if (t.includes('밝기') || t.includes('대비') || t.includes('bright'))
    return Sun
  if (t.includes('노이즈') || t.includes('noise') || t.includes('가우시안'))
    return Waves
  if (t.includes('반전') || t.includes('flip') || t.includes('좌우'))
    return FlipHorizontal
  return Activity
}

/** 레이더 차트 라벨용 짧은 이름. 너무 길면 자름. */
function shortAttackLabel(type: string): string {
  const t = type ?? ''
  if (t.includes('재인코딩')) return '재인코딩'
  if (t.includes('JPEG') || t.includes('jpeg')) return 'JPEG'
  if (t.includes('해상도')) return '해상도'
  if (t.includes('크롭')) return '크롭'
  if (t.includes('밝기')) return '밝기'
  if (t.includes('노이즈')) return '노이즈'
  if (t.includes('반전')) return '반전'
  return t.length > 8 ? t.slice(0, 8) + '…' : t
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
