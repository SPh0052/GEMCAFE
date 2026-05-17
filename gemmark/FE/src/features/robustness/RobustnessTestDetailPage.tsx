import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileDown,
  FileVideo,
  Loader2,
  X,
} from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import { extractErrorMessage } from '@/shared/lib/errors'
import TestSummaryReportTemplate, {
  type FailedVideoEntry,
  type TestSummaryReportData,
} from './components/TestSummaryReportTemplate'
import {
  getRobustnessTestDetail,
  type RobustnessTestDetail,
} from './api'

export default function RobustnessTestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const templateRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const [detail, setDetail] = useState<RobustnessTestDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError('잘못된 접근입니다. 테스트 ID가 없습니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null

    const fetch = (showLoader: boolean) => {
      if (showLoader) {
        setLoading(true)
        setError(null)
      }
      getRobustnessTestDetail(id)
        .then((res) => {
          console.log('[GET /robustness/tests/{id}] response:', res)
          if (cancelled) return
          setDetail(res)
          // 진행 중(success+fail < total) 이면 5초 뒤 자동 재조회
          const processed = res.successCount + res.failCount
          if (processed < res.totalCount) {
            pollTimer = setTimeout(() => fetch(false), 5000)
          }
        })
        .catch((err) => {
          console.error('[GET /robustness/tests/{id}] error:', err)
          if (cancelled) return
          if (showLoader) {
            setError(
              extractErrorMessage(
                err,
                '테스트 상세 정보를 불러오지 못했습니다.',
              ),
            )
          }
        })
        .finally(() => {
          if (!cancelled && showLoader) setLoading(false)
        })
    }

    fetch(true)

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [id])

  const handleExportReport = async () => {
    if (!templateRef.current || !detail) return
    setExporting(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ])

      const fileName = `T-${id}_robustness-summary.pdf`

      const pageEls =
        templateRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]')

      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      for (let i = 0; i < pageEls.length; i++) {
        if (i > 0) pdf.addPage()
        const canvas = await html2canvas(pageEls[i], {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      }

      pdf.save(fileName)
    } catch (err) {
      console.error('PDF 생성 실패', err)
      alert('PDF 생성 중 오류가 발생했습니다.')
    } finally {
      setExporting(false)
    }
  }

  // 로딩 / 에러 상태
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="강건성 분석 상세 보고서" backTo="/robustness" />
        <Card className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-sm text-gray-500">상세 정보를 불러오는 중...</p>
        </Card>
      </div>
    )
  }
  if (error || !detail) {
    return (
      <div className="space-y-6">
        <PageHeader title="강건성 분석 상세 보고서" backTo="/robustness" />
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error ?? '데이터가 없습니다.'}
        </div>
      </div>
    )
  }

  // 진행 중 판정 — success + fail 이 total 과 다르면 아직 처리 중
  const processedCount = detail.successCount + detail.failCount
  if (processedCount !== detail.totalCount) {
    return <InProgressView detail={detail} />
  }

  const totalCount = detail.totalCount
  const successRate =
    totalCount > 0 ? Math.round((detail.successCount / totalCount) * 100) : 0
  const failureRate =
    totalCount > 0 ? Math.round((detail.failCount / totalCount) * 100) : 0

  const reportData = buildReportData(id ?? '', detail)

  return (
    <div className="space-y-6">
      <PageHeader
        title="강건성 분석 상세 보고서"
        backTo="/robustness"
        actions={
          <button
            type="button"
            onClick={handleExportReport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {exporting ? 'PDF 생성 중...' : '보고서 만들기'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <h3 className="text-sm font-bold text-gray-900">테스트 설정 정보</h3>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-gray-500">설정 기간 (시작-종료)</dt>
              <dd className="mt-1 text-sm font-medium text-gray-800">
                {formatDate(detail.startDate)} ~ {formatDate(detail.endDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">총 영상 수</dt>
              <dd className="mt-1 text-sm font-medium text-gray-800">
                {detail.totalCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">관리자</dt>
              <dd className="mt-1 text-sm font-medium text-gray-800">
                {detail.admin}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">테스트 결과 개요</h3>
          <div className="mt-4 space-y-4">
            <ResultRow
              label="성공"
              count={detail.successCount}
              rate={successRate}
              tone="success"
            />
            <ResultRow
              label="실패"
              count={detail.failCount}
              rate={failureRate}
              tone="danger"
            />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">평균 품질 지표</h3>
          <dl className="mt-4 space-y-3">
            <MetricRow
              label="평균 BER"
              value={`${(detail.avgBer * 100).toFixed(2)}%`}
            />
            <MetricRow
              label="평균 PSNR"
              value={`${detail.avgPsnr.toFixed(1)} dB`}
            />
            <MetricRow
              label="평균 처리 시간"
              value={`${detail.avgDuration.toFixed(2)}초`}
            />
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">지표 편차</h3>
          <dl className="mt-4 space-y-3">
            <MetricRow
              label="표준 편차 (BER)"
              value={`${(detail.sdBer * 100).toFixed(2)}%`}
            />
            <MetricRow
              label="표준 편차 (PSNR)"
              value={`${detail.sdPsnr.toFixed(1)} dB`}
            />
            <MetricRow
              label="표준 편차 (시간)"
              value={`${detail.sdDuration.toFixed(2)}초`}
            />
          </dl>
        </Card>
      </div>

      <Card className="p-0">
        <div className="px-6 py-4">
          <h3 className="text-base font-bold text-gray-900">
            실패 영상 리스트 ({detail.failCount}건)
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-100 bg-gray-50/40 text-left text-xs font-medium text-gray-500">
              <th className="px-6 py-3 font-medium">No.</th>
              <th className="px-6 py-3 font-medium">파일명</th>
              <th className="px-6 py-3 font-medium">워터마크 ALPHA값</th>
              <th className="px-6 py-3 font-medium">상태</th>
              <th className="px-6 py-3 font-medium">상세 정보</th>
            </tr>
          </thead>
          <tbody>
            {detail.failedVideos.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-sm text-gray-400"
                >
                  실패한 영상이 없습니다.
                </td>
              </tr>
            )}
            {detail.failedVideos.map((video, idx) => (
              <tr
                key={video.id}
                onClick={() =>
                  navigate(`/robustness/${id}/videos/${video.id}`)
                }
                className="cursor-pointer border-b border-gray-100 last:border-b-0 transition hover:bg-gray-50/60"
              >
                <td className="px-6 py-4 text-sm text-gray-700">{idx + 1}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-800">
                    <FileVideo className="h-4 w-4 text-gray-400" />
                    <span>{video.fileName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {video.alpha.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <Badge tone={video.passed ? 'success' : 'danger'}>
                    {video.passed ? '통과' : '실패'}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <span
                    aria-label="상세 보기"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-500"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <TestSummaryReportTemplate ref={templateRef} data={reportData} />
    </div>
  )
}

function ResultRow({
  label,
  count,
  rate,
  tone,
}: {
  label: string
  count: number
  rate: number
  tone: 'success' | 'danger'
}) {
  const Icon = tone === 'success' ? Check : X
  const iconWrapClass =
    tone === 'success'
      ? 'bg-emerald-500 text-white'
      : 'bg-rose-500 text-white'
  const pillClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-600'
      : 'bg-rose-50 text-rose-600'

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-1 text-2xl font-bold text-gray-900">{count}</div>
      </div>
      <div
        className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 ${pillClass}`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full ${iconWrapClass}`}
        >
          <Icon className="h-4 w-4" strokeWidth={3} />
        </span>
        <span className="text-xs font-semibold">{rate}%</span>
      </div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-base font-bold text-gray-900">{value}</dd>
    </div>
  )
}

/**
 * 진행 중 화면 — 테스트가 아직 끝나지 않아 결과가 부분만 들어온 상태.
 * 상단에 테스트 진행 정보(접기 가능) + 큰 스피너 + 안내 문구.
 */
function InProgressView({ detail }: { detail: RobustnessTestDetail }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader title="강건성 분석 상세 보고서" backTo="/robustness" />

      <Card>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-expanded={!collapsed}
          className="flex w-full items-center justify-between"
        >
          <h3 className="text-base font-bold text-gray-900">테스트 진행 정보</h3>
          {collapsed ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {!collapsed && (
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs text-gray-500">설정 기간 (시작~종료)</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(detail.startDate)} ~ {formatDate(detail.endDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">총 영상 수</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">
                {detail.totalCount}
              </dd>
            </div>
          </dl>
        )}
      </Card>

      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-gray-200 bg-white px-8 py-24 shadow-sm">
        <div className="h-28 w-28 animate-spin rounded-full border-[6px] border-brand-100 border-t-brand-500" />
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">[일괄 테스트 진행 중]</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            데이터를 불러오고 분석하고 있습니다...
          </p>
          <p className="mt-3 text-sm text-gray-500">
            일괄 종료 시 알림이 전송됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}

/** 'YYYY-MM-DD' → 'YYYY.MM.DD' */
function formatDate(ymd?: string): string {
  if (!ymd) return '-'
  return ymd.replaceAll('-', '.')
}

/** PDF 보고서 데이터 — API 응답 → TestSummaryReportTemplate 형식으로 매핑. */
function buildReportData(
  testId: string,
  detail: RobustnessTestDetail,
): TestSummaryReportData {
  const now = new Date()
  return {
    reportId: `RBT-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${testId}`,
    generatedAt: now.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    testInfo: {
      testId: `T-${testId}`,
      testPeriod: `${formatDate(detail.startDate)} ~ ${formatDate(detail.endDate)}`,
      totalVideos: detail.totalCount,
      manager: detail.admin,
    },
    results: {
      successCount: detail.successCount,
      failureCount: detail.failCount,
    },
    qualityMetrics: {
      averageBer: `${(detail.avgBer * 100).toFixed(2)}%`,
      averagePsnr: `${detail.avgPsnr.toFixed(1)} dB`,
      averageFps: `${detail.avgDuration.toFixed(2)}초`,
    },
    stdDev: {
      ber: `${(detail.sdBer * 100).toFixed(2)}%`,
      psnr: `${detail.sdPsnr.toFixed(1)} dB`,
      fps: `${detail.sdDuration.toFixed(2)}초`,
    },
    // 실패 영상 — 응답에 없는 필드(failedAttack, ber, psnr)는 '-' 로 보냄.
    // 추후 BE가 추가하면 여기 매핑만 보강.
    failedVideos: detail.failedVideos.map<FailedVideoEntry>((v, i) => ({
      no: i + 1,
      fileName: v.fileName,
      alpha: v.alpha,
      failedAttack: '-',
      ber: '-',
      psnr: '-',
    })),
  }
}
