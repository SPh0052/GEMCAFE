import { forwardRef } from 'react'
import type { ReactNode } from 'react'

export interface FailedVideoEntry {
  no: number
  fileName: string
  alpha: number
  failedAttack: string
  ber: string
  psnr: string
}

export interface TestSummaryReportData {
  reportId: string
  generatedAt: string
  testInfo: {
    testId: string
    testPeriod: string
    totalVideos: number
    manager: string
  }
  results: {
    successCount: number
    failureCount: number
  }
  qualityMetrics: {
    averageBer: string
    averagePsnr: string
    averageFps: string
  }
  stdDev: {
    ber: string
    psnr: string
    fps: string
  }
  failedVideos: FailedVideoEntry[]
}

const PAGE_WIDTH = 794 // 210mm @ 96dpi
const PAGE_HEIGHT = 1123 // 297mm @ 96dpi
const VIDEOS_PER_PAGE = 22

interface Props {
  data: TestSummaryReportData
}

const TestSummaryReportTemplate = forwardRef<HTMLDivElement, Props>(
  ({ data }, ref) => {
    const failedVideoPages: FailedVideoEntry[][] = []
    if (data.failedVideos.length === 0) {
      failedVideoPages.push([])
    } else {
      for (let i = 0; i < data.failedVideos.length; i += VIDEOS_PER_PAGE) {
        failedVideoPages.push(data.failedVideos.slice(i, i + VIDEOS_PER_PAGE))
      }
    }

    const totalPages = 2 + failedVideoPages.length

    return (
      <div
        ref={ref}
        aria-hidden="true"
        style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}
      >
        <CoverPage data={data} pageNumber={1} totalPages={totalPages} />
        <SummaryPage data={data} pageNumber={2} totalPages={totalPages} />
        {failedVideoPages.map((videos, idx) => (
          <FailedVideosPage
            key={idx}
            data={data}
            videos={videos}
            pageNumber={3 + idx}
            totalPages={totalPages}
            chunkIndex={idx}
            totalChunks={failedVideoPages.length}
          />
        ))}
      </div>
    )
  },
)
TestSummaryReportTemplate.displayName = 'TestSummaryReportTemplate'
export default TestSummaryReportTemplate

function ReportPage({
  children,
  pageNumber,
  totalPages,
  data,
  showHeader = true,
}: {
  children: ReactNode
  pageNumber: number
  totalPages: number
  data: TestSummaryReportData
  showHeader?: boolean
}) {
  return (
    <div
      data-pdf-page
      className="flex flex-col bg-white text-gray-900"
      style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b border-gray-200 px-12 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <span className="text-brand-500">gem</span>
            <span>.mark</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">강건성 테스트 요약 보고서</span>
          </div>
          <div className="text-xs text-gray-400">{data.generatedAt}</div>
        </div>
      )}

      <div className="flex-1 px-12 py-10">{children}</div>

      <div className="flex items-center justify-between border-t border-gray-200 px-12 py-3 text-[10px] text-gray-400">
        <span>참조: {data.reportId}</span>
        <span>기밀 — 내부 검토용</span>
        <span>
          {pageNumber} / {totalPages} 페이지
        </span>
      </div>
    </div>
  )
}

/* ─────────── 1. 표지 ─────────── */
function CoverPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: TestSummaryReportData
  pageNumber: number
  totalPages: number
}) {
  return (
    <ReportPage
      data={data}
      pageNumber={pageNumber}
      totalPages={totalPages}
      showHeader={false}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span className="text-brand-500">gem</span>
          <span className="text-gray-900">.mark</span>
        </div>
        <div className="mt-1 text-sm tracking-widest text-gray-400">
          THE DIGITAL CURATOR
        </div>

        <div className="my-auto">
          <div className="text-sm font-semibold tracking-widest text-brand-500">
            ROBUSTNESS TEST SUMMARY
          </div>
          <h1 className="mt-4 text-5xl leading-tight font-extrabold tracking-tight text-gray-900">
            강건성 테스트
            <br />
            요약 보고서
          </h1>
          <div className="mt-6 h-1.5 w-32 rounded-full bg-brand-500" />

          <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400">
                TEST ID
              </div>
              <div className="mt-2 font-mono text-gray-800">
                {data.testInfo.testId}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400">
                GENERATED
              </div>
              <div className="mt-2 text-gray-800">{data.generatedAt}</div>
            </div>
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400">
                TEST PERIOD
              </div>
              <div className="mt-2 text-gray-800">{data.testInfo.testPeriod}</div>
            </div>
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400">
                MANAGER
              </div>
              <div className="mt-2 text-gray-800">{data.testInfo.manager}</div>
            </div>
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400">
                REFERENCE
              </div>
              <div className="mt-2 font-mono text-gray-800">{data.reportId}</div>
            </div>
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400">
                CLASSIFICATION
              </div>
              <div className="mt-2 text-gray-800">기밀 — 내부 검토용</div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 text-xs text-gray-400">
          본 보고서는 gem.mark 워터마킹 시스템에 의해 자동 생성되었습니다.
        </div>
      </div>
    </ReportPage>
  )
}

/* ─────────── 2. 요약 ─────────── */
function SummaryPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: TestSummaryReportData
  pageNumber: number
  totalPages: number
}) {
  const { successCount, failureCount } = data.results
  const total = successCount + failureCount
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0
  const failureRate = total > 0 ? Math.round((failureCount / total) * 100) : 0

  return (
    <ReportPage data={data} pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-3xl font-bold text-gray-900">Executive Summary</h2>
      <div className="mt-1 text-sm text-gray-500">테스트 요약</div>
      <div className="mt-3 h-1 w-12 rounded-full bg-brand-500" />

      {/* 테스트 설정 정보 */}
      <section className="mt-8">
        <SectionTitle>테스트 설정 정보</SectionTitle>
        <div className="mt-3 rounded-2xl border border-gray-200 p-6">
          <dl className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
            <DefRow label="테스트 ID" value={data.testInfo.testId} />
            <DefRow label="설정 기간" value={data.testInfo.testPeriod} />
            <DefRow
              label="총 영상 수"
              value={`${data.testInfo.totalVideos.toLocaleString()}개`}
            />
            <DefRow label="담당 관리자" value={data.testInfo.manager} />
          </dl>
        </div>
      </section>

      {/* 테스트 결과 개요 */}
      <section className="mt-6">
        <SectionTitle>테스트 결과 개요</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
            <div className="text-xs font-medium tracking-widest text-emerald-700">
              SUCCESS
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-emerald-700">
                {successCount}
              </span>
              <span className="text-sm font-medium text-emerald-700">
                / {total}건 ({successRate}%)
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6">
            <div className="text-xs font-medium tracking-widest text-rose-700">
              FAILURE
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-rose-700">
                {failureCount}
              </span>
              <span className="text-sm font-medium text-rose-700">
                / {total}건 ({failureRate}%)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 평균 품질 지표 / 지표 편차 */}
      <section className="mt-6">
        <SectionTitle>품질 지표</SectionTitle>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y-2 border-gray-300 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-bold tracking-wide text-gray-600">
                항목
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold tracking-wide text-gray-600">
                평균
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold tracking-wide text-gray-600">
                표준 편차
              </th>
            </tr>
          </thead>
          <tbody>
            <MetricTableRow
              label="BER (비트 오류율)"
              average={data.qualityMetrics.averageBer}
              std={data.stdDev.ber}
            />
            <MetricTableRow
              label="PSNR (화질 열화)"
              average={data.qualityMetrics.averagePsnr}
              std={data.stdDev.psnr}
            />
            <MetricTableRow
              label="처리 속도"
              average={data.qualityMetrics.averageFps}
              std={data.stdDev.fps}
            />
          </tbody>
        </table>
      </section>

      <div className="mt-8 rounded-2xl bg-gray-50 p-5 text-xs leading-relaxed text-gray-600">
        <div className="font-semibold text-gray-700">Notes</div>
        <p className="mt-2">
          BER(Bit Error Rate)은 워터마크 추출 시 발생한 비트 오류율을 의미하며
          낮을수록 좋습니다. PSNR은 원본 대비 화질 열화 정도이며 높을수록
          좋습니다. 처리 속도는 초당 프레임 처리량(FPS)입니다.
        </p>
      </div>
    </ReportPage>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
      {children}
    </div>
  )
}

function DefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="w-28 shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  )
}

function MetricTableRow({
  label,
  average,
  std,
}: {
  label: string
  average: string
  std: string
}) {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3 font-medium text-gray-800">{label}</td>
      <td className="px-4 py-3 text-right font-semibold text-gray-900">
        {average}
      </td>
      <td className="px-4 py-3 text-right text-gray-700">±{std}</td>
    </tr>
  )
}

/* ─────────── 3. 실패 영상 리스트 ─────────── */
function FailedVideosPage({
  data,
  videos,
  pageNumber,
  totalPages,
  chunkIndex,
  totalChunks,
}: {
  data: TestSummaryReportData
  videos: FailedVideoEntry[]
  pageNumber: number
  totalPages: number
  chunkIndex: number
  totalChunks: number
}) {
  const isFirstChunk = chunkIndex === 0
  return (
    <ReportPage data={data} pageNumber={pageNumber} totalPages={totalPages}>
      {isFirstChunk && (
        <>
          <h2 className="text-3xl font-bold text-gray-900">Failed Videos</h2>
          <div className="mt-1 text-sm text-gray-500">
            실패 영상 리스트 ({data.failedVideos.length}건)
          </div>
          <div className="mt-3 h-1 w-12 rounded-full bg-brand-500" />
        </>
      )}
      {!isFirstChunk && (
        <div className="text-xs font-medium tracking-widest text-gray-500">
          FAILED VIDEOS (계속)
        </div>
      )}

      <table
        className={`w-full border-collapse text-sm ${isFirstChunk ? 'mt-8' : 'mt-3'}`}
      >
        <thead>
          <tr className="border-y-2 border-gray-300 bg-gray-50">
            <th className="px-3 py-3 text-left text-xs font-bold tracking-wide text-gray-600">
              No.
            </th>
            <th className="px-3 py-3 text-left text-xs font-bold tracking-wide text-gray-600">
              파일명
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold tracking-wide text-gray-600">
              ALPHA
            </th>
            <th className="px-3 py-3 text-left text-xs font-bold tracking-wide text-gray-600">
              실패 공격 유형
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold tracking-wide text-gray-600">
              BER
            </th>
            <th className="px-3 py-3 text-right text-xs font-bold tracking-wide text-gray-600">
              PSNR
            </th>
          </tr>
        </thead>
        <tbody>
          {videos.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-3 py-8 text-center text-sm text-gray-500"
              >
                실패 영상이 없습니다.
              </td>
            </tr>
          ) : (
            videos.map((video) => (
              <tr key={video.no} className="border-b border-gray-100">
                <td className="px-3 py-3 text-gray-700">{video.no}</td>
                <td className="px-3 py-3 font-medium text-gray-800">
                  {video.fileName}
                </td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {video.alpha.toFixed(2)}
                </td>
                <td className="px-3 py-3 text-gray-700">{video.failedAttack}</td>
                <td className="px-3 py-3 text-right font-semibold text-rose-600">
                  {video.ber}
                </td>
                <td className="px-3 py-3 text-right text-gray-700">
                  {video.psnr}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {chunkIndex === totalChunks - 1 && (
        <div className="mt-8 rounded-2xl bg-gray-50 p-5 text-xs leading-relaxed text-gray-600">
          <div className="font-semibold text-gray-700">Notes</div>
          <p className="mt-2">
            실패 공격 유형은 해당 영상에서 BER 임계치를 초과한 공격을 나타냅니다.
            상세 분석은 각 영상의 강건성 분석 상세 보고서를 참고해주세요.
          </p>
        </div>
      )}
    </ReportPage>
  )
}
