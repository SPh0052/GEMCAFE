import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Crop,
  FileDown,
  Film,
  Filter,
  Loader2,
  Maximize2,
  Sun,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Card from '@/shared/components/Card'
import Badge from '@/shared/components/Badge'
import Thumbnail from '@/shared/components/Thumbnail'
import RadarChart from './components/RadarChart'

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

interface VideoInfo {
  name: string
  createdAt: string
  type: string
  size: string
  thumbnailUrl?: string
}

const mockVideo: VideoInfo = {
  name: '10kM_ai_video_1.mp4',
  createdAt: '2024.03.15 14:32',
  type: 'MP4 Video',
  size: '345 MB',
}

export default function RobustnessTestDetailPage() {
  // 실제 앱에서는 id로 서버에서 결과를 조회. 지금은 mock.
  useParams<{ id: string }>()
  const reportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const handleExportReport = async () => {
    if (!reportRef.current) return
    setExporting(true)
    try {
      // 동적 import — 초기 번들 크기 줄이기
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas-pro'),
      ])

      const fileName = `${mockVideo.name.replace(/\.[^.]+$/, '')}_robustness-report.pdf`

      // 1. DOM을 캔버스로 캡처
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f9fafb',
      })

      // 2. PDF 생성 (A4 portrait)
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      })

      const margin = 10
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      // 3. 길면 여러 페이지에 분할
      let heightLeft = imgHeight
      let position = margin

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - margin * 2

      while (heightLeft > 0) {
        position = position - (pageHeight - margin * 2)
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
        heightLeft -= pageHeight - margin * 2
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
        title="강건성 테스트"
        description="포렌식 워터마킹을 위한 편집 강건성 분석."
        backTo="/robustness"
        actions={
          <button
            type="button"
            onClick={handleExportReport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {exporting ? 'PDF 생성 중...' : '리포트 내보내기'}
          </button>
        }
      />

      <div ref={reportRef} className="space-y-6 bg-gray-50 p-1">
        <VideoInfoCard video={mockVideo} />
        <RobustnessAnalysis />
        <AttackDetailsTable attacks={mockAttacks} />
      </div>
    </div>
  )
}

function VideoInfoCard({ video }: { video: VideoInfo }) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <Thumbnail src={video.thumbnailUrl} className="h-16 w-24" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-900">
            {video.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
            <span>{video.createdAt}</span>
            <span>·</span>
            <span>{video.type}</span>
            <span>·</span>
            <span>{video.size}</span>
          </div>
        </div>
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
          <div className="flex h-65 items-center justify-center">
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

