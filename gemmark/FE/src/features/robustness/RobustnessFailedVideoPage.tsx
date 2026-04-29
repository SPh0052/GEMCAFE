import { useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  CheckCircle2,
  Crop,
  FileDown,
  Film,
  Filter,
  Maximize2,
  Sun,
  Waves,
} from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import RadarChart from './components/RadarChart'
import type { AttackRow } from './components/ReportTemplate'

const mockAttacks: AttackRow[] = [
  { icon: Film, label: 'H.264 재인코딩', param: 'CRF 23', ber: '0.02%', psnr: '41.2 dB', status: '통과' },
  { icon: Maximize2, label: '해상도 축소', param: '50% Scale', ber: '1.5%', psnr: '38.5 dB', status: '통과' },
  { icon: Crop, label: '크롭', param: 'Center 10%', ber: '4.2%', psnr: '35.1 dB', status: '경고' },
  { icon: Sun, label: '밝기/대비', param: '+20% / +10%', ber: '0.8%', psnr: '44.0 dB', status: '통과' },
  { icon: Waves, label: '가우시안 노이즈', param: 'Sigma 10', ber: '2.1%', psnr: '32.8 dB', status: '통과' },
]

interface VideoDetailInfo {
  fileName: string
  videoId: string
  createdAt: string
  size: string
  testRunDate: string
  totalFrames: number
  testStatus: '완료' | '오류'
  manager: string
}

const mockVideoDetail: VideoDetailInfo = {
  fileName: '10km_ai_video_1.mp4',
  videoId: 'a3f2-9c1b',
  createdAt: '2024.03.16 09:15',
  size: '298 MB',
  testRunDate: '2024.03.20 14:32',
  totalFrames: 12847,
  testStatus: '완료',
  manager: '관리자 보안 분석가',
}

export default function RobustnessFailedVideoPage() {
  const { id } = useParams<{ id: string; videoId: string }>()

  return (
    <div className="space-y-6">
      <PageHeader
        title="강건성 분석 상세 보고서"
        backTo={`/robustness/${id}`}
        backLabel="테스트 요약으로"
      />

      <Card>
        <dl className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
          <InfoRow label="영상 파일명" value={mockVideoDetail.fileName} />
          <InfoRow label="테스트 실시 일자" value={mockVideoDetail.testRunDate} />
          <InfoRow label="영상 ID (VideoId)" value={mockVideoDetail.videoId} />
          <InfoRow
            label="총 분석 프레임"
            value={mockVideoDetail.totalFrames.toLocaleString()}
          />
          <InfoRow label="영상 생성 일자" value={mockVideoDetail.createdAt} />
          <InfoRow
            label="테스트 상태"
            value={
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {mockVideoDetail.testStatus}
              </span>
            }
          />
          <InfoRow label="영상 크기" value={mockVideoDetail.size} />
          <InfoRow label="담당 분석가" value={mockVideoDetail.manager} />
        </dl>
      </Card>

      <RobustnessAnalysisSection />
      <AttackDetailsTable attacks={mockAttacks} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <dt className="w-32 shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="flex-1 text-sm text-gray-900">{value}</dd>
    </div>
  )
}

function RobustnessAnalysisSection() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <div className="mb-3 text-sm font-semibold text-gray-800">
          강건성 레이더
        </div>
        <div className="flex h-65 items-center justify-center">
          <RadarChart
            values={[0.85, 0.75, 0.6, 0.82, 0.7]}
            labels={['재인코딩', '해상도', '노이즈', '크롭', '밝기']}
            size={260}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-4 text-sm font-semibold text-gray-800">요약 지표</div>
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
          <div>
            <div className="text-xs text-gray-500">처리 속도</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">28.4</span>
              <span className="text-sm text-gray-500">FPS</span>
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

function AttackDetailsTable({ attacks }: { attacks: AttackRow[] }) {
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
                    <span className="font-medium text-gray-800">{row.label}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-800">{row.ber}</td>
                <td className="px-6 py-4 text-gray-800">{row.psnr}</td>
                <td className="px-6 py-4 text-right">
                  <Badge tone={row.status === '통과' ? 'success' : 'danger'} dot>
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
