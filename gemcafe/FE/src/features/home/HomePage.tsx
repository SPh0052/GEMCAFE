import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/shared/stores/useAuthStore'

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const nickname = user?.nickname ?? '사장'

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-6">
      {/* ───── 인사말 ───── */}
      <section>
        <p className="text-sm font-medium text-brand-500">Welcome back</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
          {nickname}님 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          오늘은 어떤 메뉴를 영상으로 만들어볼까요?
        </p>
      </section>

      {/* ───── 젬 잔액 카드 (거의 흰색) ───── */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-linear-to-br from-white via-white to-orange-50/40 px-6 py-6 shadow-sm">
        {/* 장식 — 패턴 도트 (아주 옅게) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--color-brand-200) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-brand-100/40 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-600 shadow-sm">
              <Sparkles className="h-3 w-3" />
              내 보유 젬
            </div>
            <button
              type="button"
              onClick={() => navigate('/me')}
              aria-label="잼 충전"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm transition hover:bg-brand-50 active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold tracking-tight text-brand-600">
              {(user?.gem ?? 0).toLocaleString()}
            </span>
            <span className="text-base font-semibold text-brand-500/80">
              젬
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            영상 1편 = 6 젬
          </div>
        </div>
      </section>

      {/* ───── 메인 CTA — 영상 생성 ───── */}
      <button
        type="button"
        onClick={() => navigate('/create')}
        className="group relative overflow-hidden rounded-3xl border border-brand-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/15 active:scale-[0.99]"
      >
        {/* corner glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-100/60 blur-2xl transition group-hover:bg-brand-200/70" />

        <div className="relative flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-orange-600 text-white shadow-lg shadow-brand-500/30 transition group-hover:scale-105">
            <Sparkles className="h-7 w-7" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600">
                AI 생성
              </span>
              <span className="text-xs text-gray-400">1~3분</span>
            </div>
            <h2 className="mt-2 text-lg font-extrabold text-gray-900">
              새 영상 만들기
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              메뉴 사진 한 장으로 매력적인 광고 영상을 자동 생성합니다.
            </p>
          </div>
          <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-brand-500" />
        </div>
      </button>

      {/* 내 영상 진입은 하단 BottomNav 의 '내 영상' 탭으로 일원화 — 홈에서는 노출하지 않음. */}
    </div>
  )
}
