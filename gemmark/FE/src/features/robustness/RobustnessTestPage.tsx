import {
  Crop,
  FileDown,
  Film,
  Gauge,
  Play,
  Sun,
  Waves,
  Maximize2,
  Filter,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import FileDropZone from '@/shared/components/FileDropZone'
import Badge from '@/shared/components/Badge'
import VideoListTable from '@/shared/components/VideoListTable'
import RadarChart from '@/features/robustness/components/RadarChart'

interface AttackRow {
  icon: LucideIcon
  label: string
  param: string
  ber: string
  psnr: string
  status: '통과' | '경고'
}

const attacks: AttackRow[] = [
  {
    icon: Film,
    label: 'H.264',
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
    psnr: '44.2 dB',
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

export default function RobustnessTest() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="강건성 테스트"
        description="보유한 워터마킹을 위한 편집 강건성 분석."
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <FileDown className="h-4 w-4" />
              리포트 내보내기
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
            >
              <Play className="h-4 w-4" />
              테스트 시작
            </button>
          </>
        }
      />

      <FileDropZone />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">강건성 분석</h2>
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
            <div className="mb-4 text-xs font-medium text-gray-500">
              품질 지표
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Metric label="평균 BER" value="4.8%" />
              <Metric label="평균 PSNR" value="42.3 dB" />
              <Metric label="처리 속도" value="28.4 FPS" />
              <div className="col-span-2 flex items-center justify-between rounded-xl bg-brand-50 p-4">
                <div>
                  <div className="text-xs text-brand-600">총점</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-brand-600">87</span>
                    <span className="text-sm text-brand-500">/100</span>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
                  A
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

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
              <th className="px-6 py-3 font-medium"></th>
              <th className="px-6 py-3 font-medium">파라미터</th>
              <th className="px-6 py-3 font-medium">BER</th>
              <th className="px-6 py-3 font-medium">PSNR</th>
              <th className="px-6 py-3 font-medium text-right pr-6">상태</th>
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
                      tone={row.status === '통과' ? 'success' : 'warning'}
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

      <VideoListTable subtitle="강건성 테스트" />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Gauge className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
