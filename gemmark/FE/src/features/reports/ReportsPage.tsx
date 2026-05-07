import {
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Settings2,
  Sparkles,
} from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'

export default function Reports() {
  return (
    <div className="space-y-6">
      <PageHeader title="보고서 관리" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ParamsPanel />
        <PreviewPanel />
      </div>

      <RecentReports />
    </div>
  )
}

function ParamsPanel() {
  return (
    <Card className="lg:col-span-2">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Settings2 className="h-4 w-4 text-brand-500" />
        매개변수 설정
      </div>

      <div className="space-y-5">
        <Field label="보고서 유형">
          <Select value="견고성 상세 보고서" />
        </Field>

        <div>
          <div className="mb-1.5 text-xs font-medium text-gray-500">
            기간 설정
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DateInput value="10/01/2023" />
            <DateInput value="10/31/2023" />
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-gray-500">
            포함할 데이터 섹션
          </div>
          <div className="space-y-2">
            <Check label="추출된 메타데이터" checked />
            <Check label="견고성 방사형 차트" checked />
            <Check label="공격 결과 테이블" />
            <Check label="모델 신뢰도 점수" checked />
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium text-gray-500">
            내보내기 형식
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormatButton label="PDF" active />
            <FormatButton label="XLSX" />
          </div>
        </div>

        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
        >
          <Sparkles className="h-4 w-4" />
          보고서 생성하기
        </button>
      </div>
    </Card>
  )
}

function PreviewPanel() {
  return (
    <Card className="lg:col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">실시간 미리보기</div>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-linear-to-br from-gray-50 to-white p-6">
        <div className="flex items-start justify-between text-xs text-gray-400">
          <span className="font-semibold text-gray-500">GemGem</span>
          <span>
            생성 일시<br />
            <span className="text-gray-500">2026년 04월 16일</span>
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-bold text-gray-900">
          워터마크 보안 분석
        </h3>
        <p className="text-lg font-bold text-gray-900">2026년 4월</p>

        <div className="mt-6 grid grid-cols-3 items-center gap-4">
          <div className="col-span-2 space-y-4">
            <div>
              <div className="text-xs text-gray-500">글로벌 신뢰도 점수</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-brand-500">98.4%</span>
                <span className="text-xs font-medium text-emerald-600">
                  +0.5%p
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">식별된 취약점</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">14</span>
                <span className="text-xs text-gray-500">
                  총 1,234개 테스트 중
                </span>
              </div>
            </div>
          </div>
          <RingChart percent={98.4} label="견고성" />
        </div>

        <div className="mt-6 space-y-2">
          <div className="h-2 w-full rounded-full bg-gray-200/70" />
          <div className="h-2 w-4/5 rounded-full bg-gray-200/70" />
          <div className="h-2 w-3/5 rounded-full bg-gray-200/70" />
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-3 text-[10px] text-gray-400">
          <span>문서: AMB-2023-OCT-0947</span>
          <span>기밀 - FBI 전용</span>
          <span>1/4 페이지</span>
        </div>
      </div>
    </Card>
  )
}

function RingChart({ percent, label }: { percent: number; label: string }) {
  const size = 100
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c
  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#ffe8e0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#FF5A3C"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-semibold text-brand-600">
        {label}
      </span>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-gray-500">{label}</div>
      {children}
    </div>
  )
}

function Select({ value }: { value: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
    >
      <span>{value}</span>
      <ChevronDown className="h-4 w-4 text-gray-400" />
    </button>
  )
}

function DateInput({ value }: { value: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
    >
      <span>{value}</span>
      <Calendar className="h-4 w-4 text-gray-400" />
    </button>
  )
}

function Check({ label, checked = false }: { label: string; checked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border ${
          checked
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-gray-300 bg-white'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
            <path d="M10 3L4.5 8.5 2 6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      {label}
    </label>
  )
}

function FormatButton({
  label,
  active = false,
}: {
  label: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-brand-500 bg-brand-50 text-brand-600'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <FileText className="h-4 w-4" />
      {label}
    </button>
  )
}

interface ReportRow {
  name: string
  type: string
  createdAt: string
  status: '완료' | '진행' | '실패'
}

const reports: ReportRow[] = [
  {
    name: '3분기 보고서',
    type: '3분기 보고서',
    createdAt: '2026. 04. 17. 14:22',
    status: '완료',
  },
  {
    name: '개발 보고서',
    type: '개발 보고서',
    createdAt: '2026. 04. 17. 09:15',
    status: '완료',
  },
  {
    name: '강건성 테스트 보고서',
    type: '강건성 테스트 보고서',
    createdAt: '2026. 04. 11. 10:45',
    status: '실패',
  },
]

function RecentReports() {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold">최근 생성된 보고서</h2>
        <a
          href="#"
          className="text-xs font-medium text-brand-500 hover:underline"
        >
          전체 아카이브 보기 →
        </a>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/60 text-left text-xs font-medium tracking-wide text-gray-500">
            <th className="px-6 py-3 font-medium">보고서명</th>
            <th className="px-6 py-3 font-medium">유형</th>
            <th className="px-6 py-3 font-medium">생성 일시</th>
            <th className="px-6 py-3 font-medium">상태</th>
            <th className="px-6 py-3 font-medium text-right">다운로드</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reports.map((r, i) => (
            <tr key={i}>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-gray-800">
                  <FileText className="h-4 w-4 text-brand-500" />
                  {r.name}
                </div>
              </td>
              <td className="px-6 py-4 text-gray-600">{r.type}</td>
              <td className="px-6 py-4 text-gray-500">{r.createdAt}</td>
              <td className="px-6 py-4">
                <Badge
                  tone={
                    r.status === '완료'
                      ? 'success'
                      : r.status === '실패'
                        ? 'danger'
                        : 'info'
                  }
                  dot
                >
                  {r.status}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  type="button"
                  aria-label="다운로드"
                  className="text-brand-500 hover:text-brand-600"
                >
                  <Download className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
