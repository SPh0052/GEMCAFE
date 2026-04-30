import { forwardRef } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import RadarChart from './RadarChart'

export interface ReportData {
  reportId: string
  generatedAt: string
  fileInfo: {
    name: string
    createdAt: string
    type: string
    size: string
  }
  metrics: {
    averageBer: string
    averagePsnr: string
    fps: string
    totalScore: number
    grade: string
  }
  radar: {
    values: number[]
    labels: string[]
  }
  attacks: AttackRow[]
}

export interface AttackRow {
  icon: LucideIcon
  label: string
  param: string
  ber: string
  psnr: string
  status: '통과' | '경고'
}

const PAGE_WIDTH = 794 // 210mm @ 96dpi
const PAGE_HEIGHT = 1123 // 297mm @ 96dpi

interface Props {
  data: ReportData
}

const ReportTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const totalPages = 4

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}
    >
      <CoverPage data={data} pageNumber={1} totalPages={totalPages} />
      <SummaryPage data={data} pageNumber={2} totalPages={totalPages} />
      <AnalysisPage data={data} pageNumber={3} totalPages={totalPages} />
      <AttackPage data={data} pageNumber={4} totalPages={totalPages} />
    </div>
  )
})
ReportTemplate.displayName = 'ReportTemplate'
export default ReportTemplate

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
  data: ReportData
  showHeader?: boolean
}) {
  return (
    <div
      data-pdf-page
      className="flex flex-col bg-white text-gray-900"
      style={{ width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px` }}
    >
      {/* 페이지 헤더 (표지 제외) */}
      {showHeader && (
        <div className="flex items-center justify-between border-b border-gray-200 px-12 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <span className="text-brand-500">gem</span>
            <span>.mark</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">워터마크 보안 분석 보고서</span>
          </div>
          <div className="text-xs text-gray-400">{data.generatedAt}</div>
        </div>
      )}

      {/* 본문 */}
      <div className="flex-1 px-12 py-10">{children}</div>

      {/* 페이지 푸터 */}
      <div className="flex items-center justify-between border-t border-gray-200 px-12 py-3 text-[10px] text-gray-400">
        <span>참조: {data.reportId}</span>
        <span>기밀 - 내부 검토용</span>
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
  data: ReportData
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
        {/* 상단 로고 */}
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span className="text-brand-500">gem</span>
          <span className="text-gray-900">.mark</span>
        </div>
        <div className="mt-1 text-sm tracking-widest text-gray-400">
          THE DIGITAL CURATOR
        </div>

        {/* 가운데 제목 영역 */}
        <div className="my-auto">
          <div className="text-sm font-semibold tracking-widest text-brand-500">
            ROBUSTNESS REPORT
          </div>
          <h1 className="mt-4 text-5xl leading-tight font-extrabold tracking-tight text-gray-900">
            워터마크 보안
            <br />
            분석 보고서
          </h1>
          <div className="mt-6 h-1.5 w-32 rounded-full bg-brand-500" />

          <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400">
                ANALYZED FILE
              </div>
              <div className="mt-2 font-mono text-gray-800">
                {data.fileInfo.name}
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
                REFERENCE
              </div>
              <div className="mt-2 font-mono text-gray-800">
                {data.reportId}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium tracking-widest text-gray-400">
                CLASSIFICATION
              </div>
              <div className="mt-2 text-gray-800">기밀 — 내부 검토용</div>
            </div>
          </div>
        </div>

        {/* 하단 푸터 영역 */}
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
  data: ReportData
  pageNumber: number
  totalPages: number
}) {
  const passed = data.attacks.filter((a) => a.status === '통과').length
  const warnings = data.attacks.filter((a) => a.status === '경고').length

  return (
    <ReportPage data={data} pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-3xl font-bold text-gray-900">Executive Summary</h2>
      <div className="mt-1 text-sm text-gray-500">요약</div>
      <div className="mt-3 h-1 w-12 rounded-full bg-brand-500" />

      {/* 영상 정보 */}
      <div className="mt-8 rounded-2xl border border-gray-200 p-6">
        <div className="text-xs font-medium tracking-widest text-gray-400">
          ANALYZED VIDEO
        </div>
        <div className="mt-2 text-lg font-semibold text-gray-900">
          {data.fileInfo.name}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
          <span>{data.fileInfo.createdAt}</span>
          <span>·</span>
          <span>{data.fileInfo.type}</span>
          <span>·</span>
          <span>{data.fileInfo.size}</span>
        </div>
      </div>

      {/* 종합 점수 강조 */}
      <div className="mt-6 rounded-2xl bg-brand-500 p-8 text-white">
        <div className="text-xs font-medium tracking-widest text-brand-100">
          OVERALL SCORE
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-7xl font-extrabold leading-none">
            {data.metrics.totalScore}
          </span>
          <span className="text-2xl text-brand-100">/100</span>
          <span className="ml-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl font-extrabold text-brand-500">
            {data.metrics.grade}
          </span>
        </div>
        <div className="mt-3 text-sm text-brand-50">
          본 영상의 워터마크는 다양한 편집 공격에 대해 우수한 강건성을 보입니다.
        </div>
      </div>

      {/* 주요 수치 */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <KpiBox label="평균 BER" value={data.metrics.averageBer} />
        <KpiBox label="평균 PSNR" value={data.metrics.averagePsnr} />
        <KpiBox label="처리 속도" value={data.metrics.fps} />
      </div>

      {/* 핵심 발견 */}
      <div className="mt-6">
        <div className="text-sm font-semibold text-gray-700">Key Findings</div>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-brand-500">•</span>
            <span>
              총 {data.attacks.length}개 공격 중{' '}
              <strong>{passed}개 통과</strong>
              {warnings > 0 ? `, ${warnings}개 경고` : ''}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-500">•</span>
            <span>
              평균 PSNR <strong>{data.metrics.averagePsnr}</strong> — 워터마크
              삽입에 의한 화질 열화는 미미한 수준
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-brand-500">•</span>
            <span>
              평균 BER <strong>{data.metrics.averageBer}</strong> — 추출
              안정성이 양호한 범위
            </span>
          </li>
        </ul>
      </div>
    </ReportPage>
  )
}

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}

/* ─────────── 3. 분석 ─────────── */
function AnalysisPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: ReportData
  pageNumber: number
  totalPages: number
}) {
  return (
    <ReportPage data={data} pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-3xl font-bold text-gray-900">Robustness Analysis</h2>
      <div className="mt-1 text-sm text-gray-500">강건성 분석</div>
      <div className="mt-3 h-1 w-12 rounded-full bg-brand-500" />

      <div className="mt-8 grid grid-cols-5 gap-6">
        {/* 레이더 */}
        <div className="col-span-3 rounded-2xl border border-gray-200 p-6">
          <div className="text-xs font-medium tracking-widest text-gray-400">
            ROBUSTNESS RADAR
          </div>
          <div className="mt-1 text-base font-semibold text-gray-800">
            5축 강건성 분포
          </div>
          <div className="mt-4 flex h-80 items-center justify-center">
            <RadarChart
              values={data.radar.values}
              labels={data.radar.labels}
              size={290}
            />
          </div>
        </div>

        {/* 요약 지표 */}
        <div className="col-span-2 space-y-4">
          <BigStat
            label="평균 BER"
            value={data.metrics.averageBer}
            note="비트 오류율 — 낮을수록 좋음"
            color="bg-rose-400"
          />
          <BigStat
            label="평균 PSNR"
            value={data.metrics.averagePsnr}
            note="화질 열화 — 높을수록 좋음"
            color="bg-blue-400"
          />
          <BigStat
            label="처리 속도"
            value={data.metrics.fps}
            note="초당 프레임 처리량"
            color="bg-emerald-400"
          />
        </div>
      </div>

      {/* 해석 */}
      <div className="mt-8 rounded-2xl bg-gray-50 p-6">
        <div className="text-xs font-medium tracking-widest text-gray-500">
          INTERPRETATION
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          본 영상은 5개 핵심 강건성 축(재인코딩·해상도·노이즈·크롭·밝기)에서
          전반적으로 안정적인 성능을 보입니다. 특히 재인코딩과 크롭에 대한
          저항력이 우수하며, 평균 PSNR {data.metrics.averagePsnr}로 시각적
          품질 손실은 거의 감지되지 않습니다.
        </p>
      </div>
    </ReportPage>
  )
}

function BigStat({
  label,
  value,
  note,
  color,
}: {
  label: string
  value: string
  note: string
  color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-gray-900">{value}</div>
      <div className={`mt-2 h-1 w-12 rounded-full ${color}`} />
      <div className="mt-3 text-[11px] text-gray-500">{note}</div>
    </div>
  )
}

/* ─────────── 4. 공격별 상세 ─────────── */
function AttackPage({
  data,
  pageNumber,
  totalPages,
}: {
  data: ReportData
  pageNumber: number
  totalPages: number
}) {
  return (
    <ReportPage data={data} pageNumber={pageNumber} totalPages={totalPages}>
      <h2 className="text-3xl font-bold text-gray-900">Attack Details</h2>
      <div className="mt-1 text-sm text-gray-500">공격별 상세 결과</div>
      <div className="mt-3 h-1 w-12 rounded-full bg-brand-500" />

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y-2 border-gray-300 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-bold tracking-wide text-gray-600">
              공격 유형
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold tracking-wide text-gray-600">
              파라미터
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold tracking-wide text-gray-600">
              BER
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold tracking-wide text-gray-600">
              PSNR
            </th>
            <th className="px-4 py-3 text-right text-xs font-bold tracking-wide text-gray-600">
              결과
            </th>
          </tr>
        </thead>
        <tbody>
          {data.attacks.map((row) => {
            const Icon = row.icon
            const passColor =
              row.status === '통과'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            return (
              <tr key={row.label} className="border-b border-gray-100">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-gray-800">
                      {row.label}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-600">{row.param}</td>
                <td className="px-4 py-4 font-semibold text-gray-800">
                  {row.ber}
                </td>
                <td className="px-4 py-4 text-gray-700">{row.psnr}</td>
                <td className="px-4 py-4 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${passColor}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${row.status === '통과' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    />
                    {row.status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* 푸터 노트 */}
      <div className="mt-10 rounded-2xl bg-gray-50 p-5 text-xs text-gray-600">
        <div className="font-semibold text-gray-700">Notes</div>
        <p className="mt-2 leading-relaxed">
          BER(Bit Error Rate)은 워터마크 추출 시 발생한 비트 오류율을
          나타내며, 낮을수록 워터마크가 잘 보존됨을 의미합니다. PSNR(Peak
          Signal-to-Noise Ratio)은 원본 대비 화질 열화 정도를 의미하며 40dB
          이상이면 시각적으로 거의 동일합니다.
        </p>
      </div>
    </ReportPage>
  )
}
