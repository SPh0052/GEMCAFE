import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import MobileShell from '@/shared/components/MobileShell'
import AppHeader from '@/layout/AppHeader'
import BottomNav from '@/layout/BottomNav'

export default function CreatingPage() {
  const navigate = useNavigate()
  const [percent, setPercent] = useState(0)

  // 데모: 3초마다 10%씩 올라가서 100%되면 내 영상 페이지로 이동
  useEffect(() => {
    const interval = setInterval(() => {
      setPercent((p) => {
        const next = p + 5
        if (next >= 100) {
          clearInterval(interval)
          setTimeout(() => navigate('/videos'), 500)
          return 100
        }
        return next
      })
    }, 300)
    return () => clearInterval(interval)
  }, [navigate])

  return (
    <MobileShell>
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <ProgressRing percent={percent} />

        <div className="text-center">
          <h1 className="text-xl font-bold">영상을 만들고 있어요...</h1>
          <p className="mt-1 text-sm text-gray-500">잠시만 기다려 주세요</p>
        </div>

        <div className="w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Pro Tip
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                원하는 분위기, 색감, 스타일을 프롬프트에 구체적으로 추가하면
                의도에 더 가까운 영상을 얻을 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </MobileShell>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 180
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (percent / 100) * c

  return (
    <div className="relative">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#ffe4ca"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#FF6A00"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-brand-500">{percent}%</span>
      </div>
    </div>
  )
}
