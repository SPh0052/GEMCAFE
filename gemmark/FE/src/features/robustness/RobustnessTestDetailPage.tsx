import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  FileDown,
  FileVideo,
  Filter,
  Loader2,
  X,
} from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import TestSummaryReportTemplate, {
  type FailedVideoEntry,
  type TestSummaryReportData,
} from './components/TestSummaryReportTemplate'

const mockSummary = {
  testId: 'T-2024-003',
  testPeriod: '2024.03.16 09:00 ~ 13:20',
  totalVideos: 100,
  manager: '엄송현',
  successCount: 85,
  failureCount: 15,
  averageBer: '1.34%',
  averagePsnr: '37.8 dB',
  averageFps: '29.1 FPS',
  stdDevBer: '0.82%',
  stdDevPsnr: '4.1 dB',
  stdDevFps: '5.5 FPS',
}

const mockFailedVideos: FailedVideoEntry[] = [
  { no: 1, fileName: 'fail_vid_01.mp4', alpha: 0.15, failedAttack: '크롭', ber: '5.2%', psnr: '29.1 dB' },
  { no: 2, fileName: 'fail_vid_02.mp4', alpha: 0.22, failedAttack: '가우시안 노이즈', ber: '6.8%', psnr: '27.5 dB' },
  { no: 3, fileName: 'fail_vid_03.mp4', alpha: 0.18, failedAttack: 'H.264 재인코딩', ber: '4.5%', psnr: '30.2 dB' },
  { no: 4, fileName: 'fail_vid_04.mp4', alpha: 0.17, failedAttack: '크롭', ber: '5.5%', psnr: '28.8 dB' },
  { no: 5, fileName: 'fail_vid_05.mp4', alpha: 0.18, failedAttack: '해상도 축소', ber: '4.9%', psnr: '29.4 dB' },
  { no: 6, fileName: 'fail_vid_06.mp4', alpha: 0.18, failedAttack: '크롭', ber: '5.1%', psnr: '29.0 dB' },
  { no: 7, fileName: 'fail_vid_07.mp4', alpha: 0.20, failedAttack: '밝기/대비', ber: '4.2%', psnr: '30.6 dB' },
  { no: 8, fileName: 'fail_vid_08.mp4', alpha: 0.15, failedAttack: '가우시안 노이즈', ber: '7.1%', psnr: '26.9 dB' },
  { no: 9, fileName: 'fail_vid_09.mp4', alpha: 0.16, failedAttack: '크롭', ber: '5.4%', psnr: '28.3 dB' },
  { no: 10, fileName: 'fail_vid_10.mp4', alpha: 0.15, failedAttack: 'H.264 재인코딩', ber: '4.8%', psnr: '29.7 dB' },
  { no: 11, fileName: 'fail_vid_11.mp4', alpha: 0.15, failedAttack: '크롭', ber: '5.6%', psnr: '28.1 dB' },
  { no: 12, fileName: 'fail_vid_12.mp4', alpha: 0.18, failedAttack: '가우시안 노이즈', ber: '6.4%', psnr: '27.8 dB' },
  { no: 13, fileName: 'fail_vid_13.mp4', alpha: 0.18, failedAttack: '해상도 축소', ber: '5.0%', psnr: '29.3 dB' },
  { no: 14, fileName: 'fail_vid_14.mp4', alpha: 0.18, failedAttack: '크롭', ber: '5.3%', psnr: '28.6 dB' },
  { no: 15, fileName: 'fail_vid_15.mp4', alpha: 0.18, failedAttack: '밝기/대비', ber: '4.4%', psnr: '30.1 dB' },
]

function buildReportData(testId: string): TestSummaryReportData {
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
      testId: mockSummary.testId,
      testPeriod: mockSummary.testPeriod,
      totalVideos: mockSummary.totalVideos,
      manager: mockSummary.manager,
    },
    results: {
      successCount: mockSummary.successCount,
      failureCount: mockSummary.failureCount,
    },
    qualityMetrics: {
      averageBer: mockSummary.averageBer,
      averagePsnr: mockSummary.averagePsnr,
      averageFps: mockSummary.averageFps,
    },
    stdDev: {
      ber: mockSummary.stdDevBer,
      psnr: mockSummary.stdDevPsnr,
      fps: mockSummary.stdDevFps,
    },
    failedVideos: mockFailedVideos,
  }
}

const COMPLETED_TEST_IDS = new Set([
  'T-2024-001',
  'T-2024-002',
  'T-2024-003',
  'T-2024-004',
  'T-2024-005',
])

export default function RobustnessTestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const templateRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  if (id && !COMPLETED_TEST_IDS.has(id)) {
    return <InProgressView />
  }

  const reportData = buildReportData(id ?? mockSummary.testId)

  const successRate = Math.round(
    (mockSummary.successCount / mockSummary.totalVideos) * 100,
  )
  const failureRate = Math.round(
    (mockSummary.failureCount / mockSummary.totalVideos) * 100,
  )

  const handleExportReport = async () => {
    if (!templateRef.current) return
    setExporting(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ])

      const fileName = `${mockSummary.testId}_robustness-summary.pdf`

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
                {mockSummary.testPeriod}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">총 영상 수</dt>
              <dd className="mt-1 text-sm font-medium text-gray-800">
                {mockSummary.totalVideos}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">관리자</dt>
              <dd className="mt-1 text-sm font-medium text-gray-800">
                {mockSummary.manager}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">테스트 결과 개요</h3>
          <div className="mt-4 space-y-4">
            <ResultRow
              label="성공"
              count={mockSummary.successCount}
              rate={successRate}
              tone="success"
            />
            <ResultRow
              label="실패"
              count={mockSummary.failureCount}
              rate={failureRate}
              tone="danger"
            />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">평균 품질 지표</h3>
          <dl className="mt-4 space-y-3">
            <MetricRow label="평균 BER" value={mockSummary.averageBer} />
            <MetricRow label="평균 PSNR" value={mockSummary.averagePsnr} />
            <MetricRow label="평균 처리 속도" value={mockSummary.averageFps} />
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">지표 편차</h3>
          <dl className="mt-4 space-y-3">
            <MetricRow label="표준 편차 (BER)" value={mockSummary.stdDevBer} />
            <MetricRow label="표준 편차 (PSNR)" value={mockSummary.stdDevPsnr} />
            <MetricRow label="표준 편차 (속도)" value={mockSummary.stdDevFps} />
          </dl>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-bold text-gray-900">
            실패 영상 리스트 ({mockSummary.failureCount}건)
          </h3>
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
              onClick={handleExportReport}
              disabled={exporting}
              aria-label="리포트 내보내기"
              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-100 bg-gray-50/40 text-left text-xs font-medium text-gray-500">
              <th className="px-6 py-3 font-medium">No.</th>
              <th className="px-6 py-3 font-medium">파일명</th>
              <th className="px-6 py-3 font-medium">워터마크 ALPHA값</th>
              <th className="px-6 py-3 font-medium">상태(실패)</th>
              <th className="px-6 py-3 font-medium">상세 정보</th>
            </tr>
          </thead>
          <tbody>
            {mockFailedVideos.map((video) => (
              <tr
                key={video.no}
                onClick={() =>
                  navigate(`/robustness/${id}/videos/${video.no}`)
                }
                className="cursor-pointer border-b border-gray-100 last:border-b-0 transition hover:bg-gray-50/60"
              >
                <td className="px-6 py-4 text-sm text-gray-700">{video.no}</td>
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
                  <Badge tone="danger">실패</Badge>
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

function InProgressView() {
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
                2024.03.16 09:00 ~ 13:20
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">총 영상 수</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900">100</dd>
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
