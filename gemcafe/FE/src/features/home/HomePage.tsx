import { useNavigate } from 'react-router-dom'
import { Sparkles, Video } from 'lucide-react'
import Button from '@/shared/components/Button'
import { useAuthStore } from '@/shared/stores/useAuthStore'

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-6">
      {/* 인사말 */}
      <section>
        <p className="text-sm text-gray-500">안녕하세요</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {user?.nickname ?? '사장'}님 👋
        </h1>
      </section>

      {/* 젬 잔액 카드 */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 px-5 py-5 text-white shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wider opacity-80">
          내 보유 젬
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-3xl font-bold">
            {(user?.gem ?? 0).toLocaleString()}
          </span>
          <span className="text-sm font-medium opacity-90">젬</span>
        </div>
        <div className="mt-3 text-xs opacity-80">
          영상 1개당 1젬이 차감됩니다
        </div>
      </section>

      {/* 메인 CTA */}
      <button
        type="button"
        onClick={() => navigate('/create')}
        className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/40 px-6 py-10 transition hover:border-brand-400 hover:bg-brand-50"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm">
          <Sparkles className="h-7 w-7" />
        </span>
        <span className="text-lg font-bold text-gray-900">영상 생성하기</span>
        <span className="text-sm text-gray-500">
          AI가 메뉴 사진으로 식감 영상을 만들어드려요
        </span>
      </button>

      {/* 보조 액션 */}
      <Button
        variant="outline"
        size="lg"
        fullWidth
        onClick={() => navigate('/videos')}
      >
        <Video className="h-4 w-4" />
        내 영상 보기
      </Button>
    </div>
  )
}
