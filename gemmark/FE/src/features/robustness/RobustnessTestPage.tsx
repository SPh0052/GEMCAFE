import { useNavigate } from 'react-router-dom'
import { Play, RotateCw } from 'lucide-react'
import PageHeader from '@/shared/components/PageHeader'
import Badge from '@/shared/components/Badge'

type TestStatus = '완료' | '오류' | '진행중'

interface RobustnessTestRow {
  id: string
  startedAt: string
  endedAt: string | null
  status: TestStatus
  totalCount: number
  successCount: number
  failureCount: number
}

const mockTests: RobustnessTestRow[] = [
  {
    id: 'T-2024-001',
    startedAt: '2024.03.14 09:00',
    endedAt: '2024.03.14 11:30',
    status: '완료',
    totalCount: 50,
    successCount: 48,
    failureCount: 2,
  },
  {
    id: 'T-2024-002',
    startedAt: '2024.03.15 13:00',
    endedAt: '2024.03.15 15:45',
    status: '완료',
    totalCount: 75,
    successCount: 70,
    failureCount: 5,
  },
  {
    id: 'T-2024-003',
    startedAt: '2024.03.16 10:15',
    endedAt: '2024.03.16 13:20',
    status: '오류',
    totalCount: 100,
    successCount: 85,
    failureCount: 15,
  },
  {
    id: 'T-2024-004',
    startedAt: '2024.03.17 08:30',
    endedAt: '2024.03.17 10:50',
    status: '완료',
    totalCount: 60,
    successCount: 45,
    failureCount: 15,
  },
  {
    id: 'T-2024-005',
    startedAt: '2024.03.18 14:00',
    endedAt: '2024.03.18 16:30',
    status: '완료',
    totalCount: 40,
    successCount: 38,
    failureCount: 2,
  },
  {
    id: 'T-2024-006',
    startedAt: '2024.03.18 17:00',
    endedAt: null,
    status: '진행중',
    totalCount: 100,
    successCount: 0,
    failureCount: 0,
  },
]

const columns: { key: string; label: string }[] = [
  { key: 'id', label: '테스트 ID' },
  { key: 'period', label: '지정 일자 (시작~종료)' },
  { key: 'status', label: '상태' },
  { key: 'totalCount', label: '영상 갯수' },
  { key: 'successCount', label: '성공 갯수' },
  { key: 'failureCount', label: '실패 갯수' },
]

const statusToneMap: Record<TestStatus, 'success' | 'danger' | 'warning'> = {
  완료: 'success',
  오류: 'danger',
  진행중: 'warning',
}

export default function RobustnessTest() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        title="강건성 테스트"
        description="포렌식 워터마킹을 위한 편집 강건성 분석."
        actions={
          <button
            type="button"
            onClick={() => navigate('/robustness/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            <Play className="h-4 w-4" />
            테스트 시작
          </button>
        }
      />

      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-base font-bold text-gray-900">테스트 실행 내역</h2>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:underline"
          >
            <RotateCw className="h-3.5 w-3.5" />
            목록 업데이트
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-100 bg-gray-50/40 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3.5 text-sm font-semibold text-gray-800"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockTests.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/robustness/${row.id}`)}
                className="cursor-pointer border-b border-gray-100 transition last:border-b-0 hover:bg-gray-50/60"
              >
                <td className="px-6 py-4 text-sm text-gray-700">{row.id}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {row.startedAt} ~{' '}
                  {row.endedAt ?? (
                    <span className="font-medium text-amber-600">(진행중)</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge tone={statusToneMap[row.status]}>{row.status}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.totalCount}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{row.successCount}</td>
                <td className="px-6 py-4 text-sm font-medium text-rose-600">
                  {row.failureCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
