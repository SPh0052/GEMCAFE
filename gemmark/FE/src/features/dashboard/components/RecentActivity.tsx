import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from 'lucide-react'

type TestStatus = '진행중' | '완료' | '오류'

interface RecentTest {
  no: number
  testId: string
  fileName: string
  avgBer: string
  avgPsnr: string
  status: TestStatus
}

const recentTests: RecentTest[] = [
  { no: 1, testId: 'RT-001', fileName: 'sample_video_01.mp4', avgBer: '2.1%', avgPsnr: '38.2 dB', status: '진행중' },
  { no: 2, testId: 'RT-002', fileName: 'example_media_02.mov', avgBer: '1.8%', avgPsnr: '40.1 dB', status: '완료' },
  { no: 3, testId: 'RT-003', fileName: 'test_asset_03.mp4', avgBer: '3.5%', avgPsnr: '36.8 dB', status: '오류' },
  { no: 4, testId: 'RT-004', fileName: 'test_asset_03.mp4', avgBer: '2.2%', avgPsnr: '38.8 dB', status: '완료' },
  { no: 5, testId: 'RT-005', fileName: 'example_media_02.mov', avgBer: '2.7%', avgPsnr: '38.3 dB', status: '완료' },
]

export default function RecentActivity() {
  const navigate = useNavigate()

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        최근 강건성 테스트 내역
      </h2>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 text-left text-sm font-medium text-gray-500">
            <th className="py-3 pr-4 font-medium">No.</th>
            <th className="py-3 pr-4 font-medium">테스트 ID</th>
            <th className="py-3 pr-4 font-medium">영상 파일명</th>
            <th className="py-3 pr-4 font-medium">평균 BER</th>
            <th className="py-3 pr-4 font-medium">평균 PSNR</th>
            <th className="py-3 pr-4 font-medium">상태</th>
            <th className="py-3 pl-4" />
          </tr>
        </thead>
        <tbody>
          {recentTests.map((row) => (
            <tr
              key={row.no}
              onClick={() => navigate('/robustness')}
              className="cursor-pointer border-b border-gray-100 last:border-b-0 transition hover:bg-gray-50/60"
            >
              <td className="py-4 pr-4 text-sm text-gray-700">{row.no}</td>
              <td className="py-4 pr-4 text-sm font-medium text-gray-800">
                {row.testId}
              </td>
              <td className="py-4 pr-4 text-sm text-gray-700">{row.fileName}</td>
              <td className="py-4 pr-4 text-sm text-gray-700">{row.avgBer}</td>
              <td className="py-4 pr-4 text-sm text-gray-700">{row.avgPsnr}</td>
              <td className="py-4 pr-4">
                <StatusBadge status={row.status} />
              </td>
              <td className="py-4 pl-4 text-right">
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: TestStatus }) {
  if (status === '진행중') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        진행 중
      </span>
    )
  }
  if (status === '완료') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4 fill-emerald-500 text-white" />
        완료
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-rose-600">
      <AlertTriangle className="h-4 w-4 fill-rose-500 text-white" />
      오류
    </span>
  )
}
