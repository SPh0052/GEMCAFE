import { ShieldCheck, Link2, CloudUpload, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Activity {
  time: string
  icon: LucideIcon
  content: ReactNode
}

const activities: Activity[] = [
  {
    time: '14 : 32',
    icon: ShieldCheck,
    content: (
      <>
        검증 영상 <span className="font-medium text-brand-500">a3f2-9c1b</span>{' '}
        <span className="text-gray-500">AI 생성 확인 - 신뢰도 94%</span>
      </>
    ),
  },
  {
    time: '14 : 28',
    icon: Link2,
    content: (
      <>
        삽입 완료{' '}
        <span className="font-medium text-brand-500">
          gemgem.Pro_Commercial_v2.mp4
        </span>
      </>
    ),
  },
  {
    time: '14 : 15',
    icon: CloudUpload,
    content: <>대기열 12개 영상 삽입 프로세스 시작</>,
  },
  {
    time: '13 : 58',
    icon: AlertCircle,
    content: (
      <>
        탐지{' '}
        <span className="font-medium text-brand-500">
          Unauthenticated Content
        </span>{' '}
        <span className="text-gray-500">- 외부 채널 유입 (TikTok 시뮬)</span>
      </>
    ),
  },
]

export default function RecentActivity() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">최근 활동</h2>
        <a
          href="#"
          className="text-sm font-medium text-brand-500 hover:underline"
        >
          모두 보기
        </a>
      </div>
      <ul className="space-y-6">
        {activities.map((a, i) => {
          const Icon = a.icon
          return (
            <li key={i} className="flex items-center gap-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                <Icon className="h-5 w-5" />
              </div>
              <span className="w-16 shrink-0 font-mono text-sm text-gray-400">
                {a.time}
              </span>
              <span className="text-sm text-gray-700">{a.content}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
