import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowDown,
  Camera,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Music,
  Play,
  Share2,
  Sparkles,
  Type,
  UtensilsCrossed,
  Wand2,
  Zap,
} from 'lucide-react'
import SiteFooter from '@/layout/SiteFooter'

const ASSET = (file: string) => `${import.meta.env.BASE_URL}${file}`

export default function IntroPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900 antialiased">
      {/* ───── Top Nav (fixed) ───── */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 pb-3 pt-4 sm:gap-4 sm:px-10 sm:pb-4 sm:pt-6">
          <Link
            to="/intro"
            className="group flex shrink-0 items-center gap-2 sm:gap-3"
          >
            <img
              src={ASSET('logo.png')}
              alt="gem.cafe 로고"
              className="h-9 w-9 transition group-hover:scale-105 sm:h-12 sm:w-12"
            />
            <img
              src={ASSET('logo_text.png')}
              alt="gem.cafe"
              className="h-6 sm:h-8"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <Link
              to="/login"
              className="whitespace-nowrap rounded-lg bg-brand-100 px-3 py-2 text-sm font-medium text-brand-500 transition hover:bg-brand-200 sm:px-5 sm:py-2.5 sm:text-base"
            >
              로그인
            </Link>
            <Link
              to="/signup"
              className="whitespace-nowrap rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 sm:px-5 sm:py-2.5 sm:text-base"
            >
              회원가입
            </Link>
          </div>
        </div>
      </nav>

      {/* nav 가 fixed 라 본문이 가려지지 않도록 스페이서 */}
      <div className="h-16 sm:h-24" aria-hidden="true" />

      {/* ═══════════════════════════════════ HERO (centered, miricanvas-style) ═══════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-linear-to-b from-orange-50 via-white to-white" />
        <div className="absolute -left-32 -top-32 -z-10 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl" />
        <div className="absolute -right-32 top-40 -z-10 h-112 w-md rounded-full bg-amber-300/25 blur-3xl" />

        <div className="mx-auto max-w-5xl px-7 pb-20 pt-16 text-center sm:px-8 sm:pb-28 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand-600 shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-brand-500" />
            </span>
            카페 영상 자동 생성
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            카페 광고 영상,
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 bg-linear-to-br from-brand-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                AI 가 1분 만에
              </span>
              <span className="absolute inset-x-0 -bottom-2 h-3 -rotate-1 rounded-full bg-brand-200/50 blur-sm" />
            </span>
            <br className="sm:hidden" />
            <span className="whitespace-nowrap"> 완성</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg md:text-xl">
            메뉴 사진 한 장만 올리면 AI 가 카페 분위기에 맞는{' '}
            <br className="hidden sm:block" />
            매력적인 광고 영상을 자동으로 만들어드려요.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-linear-to-br from-brand-500 to-orange-600 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-brand-500/30 transition hover:shadow-2xl hover:shadow-brand-500/40"
            >
              <span className="absolute inset-0 bg-linear-to-br from-white/0 via-white/20 to-white/0 opacity-0 transition group-hover:opacity-100" />
              <span className="relative">무료로 시작하기</span>
              <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-6 py-4 text-base font-semibold text-gray-800 backdrop-blur transition hover:bg-white"
            >
              사용법 보기
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-gray-500">
            <Tick>가입 즉시 무료 체험</Tick>
            <Tick>카드 등록 불필요</Tick>
            <Tick>모바일 PWA 지원</Tick>
          </div>

          {/* Hero visual — big centered phone with decorations */}
          <div className="relative mx-auto mt-16 w-full max-w-2xl">
            {/* Floating left chip — 약 3배 사이즈 */}
            <div className="absolute -left-4 top-2 z-20 rotate-[-8deg] rounded-3xl bg-white px-6 py-4 shadow-2xl shadow-gray-900/15 ring-1 ring-gray-100 sm:-left-16 sm:px-8 sm:py-5">
              <div className="flex items-center gap-3 text-lg font-semibold text-gray-800 sm:gap-4 sm:text-2xl">
                <Sparkles className="h-6 w-6 text-brand-500 sm:h-8 sm:w-8" />
                AI 가 분석 중...
              </div>
            </div>
            {/* Floating right chip — 약 3배 사이즈 */}
            <div className="absolute -right-4 bottom-24 z-20 rotate-6 rounded-3xl bg-white px-6 py-4 shadow-2xl shadow-gray-900/15 ring-1 ring-gray-100 sm:-right-16 sm:px-8 sm:py-5">
              <div className="flex items-center gap-3 text-lg font-semibold text-gray-800 sm:gap-4 sm:text-2xl">
                <Clock3 className="h-6 w-6 text-orange-500 sm:h-8 sm:w-8" />
                1분이면 완성
              </div>
            </div>

            {/* glow */}
            <div className="absolute inset-0 -z-10 translate-y-10 scale-95 rounded-[3rem] bg-linear-to-br from-brand-400/40 via-orange-300/30 to-rose-300/40 blur-3xl" />

            <div className="relative mx-auto w-72 rotate-3 overflow-hidden rounded-[2.5rem] border-10 border-gray-900 bg-gray-900 shadow-2xl shadow-gray-900/40 transition hover:rotate-0 sm:w-80">
              <div
                className="relative aspect-9/16 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${ASSET('hanok.png')})` }}
              >
                <div className="absolute left-1/2 top-3 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-gray-900" />
                <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/0 to-black/70" />

                <div className="absolute inset-0 flex flex-col justify-between p-6">
                  <div className="mt-6 self-start rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-600">
                    AI 생성 · 00:45
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-white drop-shadow-lg">
                      딸기 생크림
                      <br />
                      케이크
                    </div>
                    <div className="mt-1 text-xs font-medium text-white/85">
                      한옥 카페 · 흘러내리기 효과
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-white/30">
                        <div className="h-full w-1/3 rounded-full bg-brand-500" />
                      </div>
                      <span className="text-[10px] font-medium text-white/70">
                        0:15 / 0:45
                      </span>
                    </div>
                  </div>
                </div>

                {/* play button */}
                <button
                  type="button"
                  className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-xl backdrop-blur transition hover:scale-110"
                >
                  <Play className="h-7 w-7 fill-brand-500 text-brand-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ STATS STRIP ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gray-950 py-14 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,106,0,0.18),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-7 sm:px-8">
          <div className="grid grid-cols-2 gap-y-10 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="bg-linear-to-br from-brand-300 to-orange-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                  {s.value}
                </div>
                <div className="mt-1.5 text-xs font-medium tracking-wide text-gray-400 sm:text-sm">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ INPUT → OUTPUT FLOW ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-linear-to-b from-white via-orange-50/50 to-amber-50/40 py-24 sm:py-32">
        <div className="pointer-events-none absolute -right-32 top-32 -z-10 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-20 -z-10 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="mx-auto max-w-6xl px-7 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-600">
              How it works
            </span>
            <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              사진 한 장이면
              <br />
              <span className="bg-linear-to-r from-brand-500 to-orange-500 bg-clip-text text-transparent">
                광고 영상이 완성
              </span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-gray-600 sm:text-lg">
              복잡한 편집 없이, AI 가 알아서 만들어드려요.
            </p>
          </div>

          {/* 3-step visual flow: Photo → AI → Video */}
          <div className="mt-20 grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {/* Photo */}
            <FlowCard
              title="① 메뉴 사진"
              subtitle="딸기 생크림 케이크.jpg"
              icon={Camera}
              bg={ASSET('flow.png')}
              accent="from-amber-100 to-orange-100"
            />

            <FlowArrow />

            {/* AI */}
            <div className="relative flex flex-col rounded-4xl border border-gray-100 bg-linear-to-br from-gray-900 to-gray-950 p-7 text-white shadow-xl">
              <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-brand-500/30 blur-3xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Sparkles className="h-6 w-6 text-brand-300" />
              </div>
              <div className="relative mt-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-brand-300">
                  ② AI 가 분석
                </div>
                <div className="mt-2 text-xl font-semibold">
                  색·질감·재료 자동 인식
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {['딸기', '크림', '촉촉함'].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/90"
                    >
                      # {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <FlowArrow />

            {/* Video */}
            <FlowCard
              title="③ 광고 영상"
              subtitle="00:45 · 한옥 카페"
              icon={Play}
              bg={ASSET('hanok.png')}
              accent="from-rose-100 to-brand-100"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ 4 STEP DETAIL ═══════════════════════════════════ */}
      <section
        id="how"
        className="relative overflow-hidden bg-linear-to-b from-amber-50/40 via-white to-orange-50/30 py-24 sm:py-32"
      >
        <div className="pointer-events-none absolute -left-32 top-20 -z-10 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 -z-10 h-96 w-96 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="mx-auto max-w-7xl px-7 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              4단계면 끝나요
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
              누구나 1분이면 영상을 만들 수 있어요.
            </p>
          </div>

          <ol className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="group relative flex flex-col rounded-[1.75rem] border border-gray-100 bg-white p-7 shadow-[0_2px_24px_-8px_rgba(0,0,0,0.08)] transition hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-16px_rgba(255,106,0,0.2)]"
              >
                <div className="absolute -top-5 left-7 flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-orange-600 text-sm font-extrabold text-white shadow-lg shadow-brand-500/40">
                  {i + 1}
                </div>
                <div className="mt-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-brand-50 to-orange-100/60 text-brand-500 transition group-hover:scale-110">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══════════════════════════════════ ALTERNATING FEATURES ═══════════════════════════════════ */}
      <section className="bg-linear-to-b from-orange-50/30 via-white to-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-7 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
              Features
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              마케팅에 필요한
              <br />
              모든 것이 한 곳에
            </h2>
          </div>

          <div className="mt-20 space-y-24 sm:space-y-32">
            {altFeatures.map((f, i) => {
              const reverse = i % 2 === 1
              return (
                <div
                  key={f.title}
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                    reverse ? 'lg:[&>div:first-child]:order-2' : ''
                  }`}
                >
                  {/* Visual */}
                  <div className="relative">
                    <div className="absolute inset-0 -z-10 translate-y-6 scale-95 rounded-4xl bg-linear-to-br from-brand-200/40 via-orange-100/30 to-amber-100/30 blur-3xl" />
                    <div className="relative grid grid-cols-2 gap-3">
                      {f.images.map((img, k) => (
                        <div
                          key={k}
                          className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-gray-100"
                          style={{
                            transform:
                              k === 0
                                ? 'translateY(-12px)'
                                : 'translateY(12px)',
                          }}
                        >
                          <div
                            className="aspect-4/5 w-full bg-cover bg-center transition duration-700 hover:scale-110"
                            style={{ backgroundImage: `url(${img})` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Copy */}
                  <div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-600">
                      <f.icon className="h-3.5 w-3.5" />
                      {f.label}
                    </span>
                    <h3 className="mt-5 whitespace-pre-line text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                      {f.title}
                    </h3>
                    <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
                      {f.desc}
                    </p>
                    <ul className="mt-6 space-y-2.5">
                      {f.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-2 text-sm text-gray-700"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-extrabold text-brand-600">
                            ✓
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ MARQUEE ═══════════════════════════════════ */}
      <section className="overflow-hidden border-y border-gray-100 bg-white py-8">
        <div className="flex animate-[scroll_25s_linear_infinite] gap-12 whitespace-nowrap text-3xl font-extrabold uppercase tracking-tight text-gray-200 sm:text-4xl">
          {Array(2)
            .fill(null)
            .map((_, j) => (
              <div key={j} className="flex shrink-0 items-center gap-12">
                {marqueeWords.map((w, i) => (
                  <span key={`${j}-${i}`} className="flex items-center gap-12">
                    <span
                      className={
                        i % 3 === 0
                          ? 'bg-linear-to-r from-brand-400 to-orange-500 bg-clip-text text-transparent'
                          : ''
                      }
                    >
                      {w}
                    </span>
                    <span className="text-brand-300">✦</span>
                  </span>
                ))}
              </div>
            ))}
        </div>
        <style>{`
          @keyframes scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* ═══════════════════════════════════ AUDIENCES ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-linear-to-br from-brand-500 via-orange-500 to-rose-500 py-24 text-white sm:py-32">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-7 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              이런 분께
              <br />
              추천해요
            </h2>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {audiences.map((a, i) => (
              <div
                key={a.title}
                className="group rounded-4xl border border-white/20 bg-white/10 p-7 backdrop-blur-lg transition hover:-translate-y-1 hover:bg-white/15"
              >
                <div className="text-5xl font-extrabold text-white/30">
                  0{i + 1}
                </div>
                <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white">
                  <a.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">
                  {a.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/85">
                  {a.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ FAQ ═══════════════════════════════════ */}
      <section className="relative overflow-hidden bg-linear-to-b from-white via-amber-50/30 to-orange-50/40 py-24 sm:py-32">
        <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-orange-200/25 blur-3xl" />
        <div className="mx-auto max-w-3xl px-7 sm:px-8">
          <div className="text-center">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-600">
              FAQ
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              자주 묻는 질문
            </h2>
          </div>

          <div className="mt-12 divide-y divide-gray-100 rounded-4xl border border-gray-100 bg-white">
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className="group px-6 py-5"
                open={i === 0 ? true : undefined}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="text-base font-semibold text-gray-900 sm:text-lg">
                    Q. {f.q}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 transition group-open:rotate-180">
                    <ArrowDown className="h-4 w-4" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ FINAL CTA ═══════════════════════════════════ */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute left-1/2 top-1/2 -z-10 h-160 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-linear-to-br from-brand-200/40 via-orange-200/30 to-rose-200/40 blur-3xl" />

        <div className="mx-auto max-w-3xl px-7 text-center sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-600 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            지금 시작하기
          </div>
          <h2 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            첫 영상,
            <br />
            <span className="bg-linear-to-br from-brand-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              지금 1분이면
            </span>
            <br className="sm:hidden" />
            <span className="whitespace-nowrap"> 완성</span>
          </h2>
          <p className="mt-6 text-lg text-gray-600 sm:text-xl">
            가입 즉시 무료로 사용해보실 수 있습니다.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-linear-to-br from-brand-500 to-orange-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-brand-500/40 transition hover:shadow-2xl hover:shadow-brand-500/50"
            >
              무료로 시작하기
              <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="rounded-full px-6 py-4 text-base font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              이미 계정이 있어요 →
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

/* ───────── 보조 컴포넌트 ───────── */

function FlowCard({
  title,
  subtitle,
  icon: Icon,
  bg,
  accent,
}: {
  title: string
  subtitle: string
  icon: typeof Camera
  bg: string
  accent: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-4xl border border-gray-100 bg-white shadow-xl transition hover:-translate-y-1">
      <div className={`relative aspect-4/5 bg-linear-to-br ${accent}`}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg})` }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 text-brand-500 shadow-md backdrop-blur">
          <Icon className="h-5 w-5" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/80 drop-shadow">
            {title}
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight drop-shadow-lg">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  )
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center md:py-12">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-500 md:rotate-0">
        <ArrowRight className="hidden h-5 w-5 md:block" />
        <ArrowDown className="h-5 w-5 md:hidden" />
      </div>
    </div>
  )
}

/* ───────── 데이터 ───────── */

const stats = [
  { value: '1분', label: '평균 생성 시간' },
  { value: '94+', label: '내장 스티커' },
  { value: '10종', label: 'BGM 트랙' },
  { value: '무제한', label: '편집 가능' },
]

const steps = [
  {
    icon: ImageIcon,
    title: '메뉴 사진 업로드',
    desc: '카페 메뉴 사진 한 장만 올리면 AI 가 자동으로 분석해드려요.',
  },
  {
    icon: Wand2,
    title: '옵션 선택',
    desc: '시뮬레이션 효과, 배경, 강조 포인트를 골라 분위기를 결정하세요.',
  },
  {
    icon: Sparkles,
    title: 'AI 영상 생성',
    desc: '1~3분 정도 기다리면 매장 분위기에 맞는 광고 영상이 완성됩니다.',
  },
  {
    icon: Share2,
    title: '편집 & 공유',
    desc: '텍스트·스티커·BGM 으로 꾸미고 SNS·카톡으로 바로 공유하세요.',
  },
]

const altFeatures = [
  {
    icon: Sparkles,
    label: 'AI 분석',
    title: 'AI 가 메뉴 사진을 분석해서\n알아서 만들어줘요',
    desc: '사진 한 장만 올리면 색·질감·재료를 자동 인식하고, 카페 분위기에 어울리는 영상을 만들어드립니다. 복잡한 편집 지식 없이도 결과물이 자연스러워요.',
    bullets: [
      '색·질감·재료 자동 추출',
      '추천 강조 포인트 태그 제공',
      '자동 프롬프트 생성 지원',
    ],
    images: [ASSET('flow.png'), ASSET('chop.png')],
  },
  {
    icon: ImageIcon,
    label: '시뮬레이션 & 배경',
    title: '카페 분위기에 맞는\n시뮬레이션과 배경',
    desc: '크림 흘러내리기, 단면 보여주기, 반으로 가르기 등 3가지 시뮬레이션과 한옥 카페·레트로·나무 책상·피크닉 4가지 배경을 자유롭게 조합할 수 있어요.',
    bullets: [
      '3가지 시뮬레이션 효과',
      '4가지 분위기 배경',
      '강조할 포인트 직접 선택',
    ],
    images: [ASSET('hanok.png'), ASSET('retro.png')],
  },
  {
    icon: Type,
    label: '편집 & 공유',
    title: '텍스트·스티커·BGM\n한 화면에서 완성',
    desc: '내장 편집기에서 텍스트·스티커·아웃라인을 자유롭게 얹고, 94개 스티커와 5개 카테고리 BGM 까지 추가하세요. 완성한 영상은 카톡·인스타·릴스로 바로 공유 가능합니다.',
    bullets: [
      '94개 내장 스티커 & BGM 라이브러리',
      '드래그·리사이즈·회전 자유 편집',
      'Web Share API 로 즉시 공유',
    ],
    images: [ASSET('wood.png'), ASSET('picnic.png')],
  },
]

const audiences = [
  {
    icon: UtensilsCrossed,
    title: '1인 카페 사장님',
    desc: '디자이너 없이도 매장 분위기를 살린 광고 영상을 직접 만들어보세요.',
  },
  {
    icon: Zap,
    title: '신메뉴 마케팅 담당자',
    desc: '신메뉴 출시할 때마다 빠르게 SNS 영상을 찍어 올릴 수 있어요.',
  },
  {
    icon: Music,
    title: 'SNS · 릴스 운영자',
    desc: 'BGM 까지 입혀진 짧은 영상으로 인스타·릴스 콘텐츠를 채워보세요.',
  },
]

const faqs = [
  {
    q: '결과물의 저작권은 누구에게 있나요?',
    a: 'gem.cafe 로 생성한 영상의 저작권은 사용자에게 귀속됩니다. 상업적 용도(매장 광고, SNS 마케팅 등)로 자유롭게 활용하실 수 있어요.',
  },
  {
    q: '영상 한 편당 얼마나 걸리나요?',
    a: '평균 1~3분 정도 소요됩니다. 가입 즉시 무료로 첫 영상을 만들어보실 수 있습니다.',
  },
  {
    q: '모바일에서도 편집할 수 있나요?',
    a: '네, gem.cafe 는 모바일 PWA 로 설계되어 스마트폰에서 바로 촬영·업로드·편집·공유까지 가능합니다.',
  },
  {
    q: '어떤 사진을 올려야 결과가 잘 나오나요?',
    a: '조명이 밝고 메뉴가 정면에서 잘 보이는 사진일수록 AI 분석이 정확해집니다. 배경이 단순한 사진을 추천드려요.',
  },
  {
    q: 'BGM 은 저작권 문제가 없나요?',
    a: '내장 BGM 은 모두 상업적 이용이 가능한 무료 라이센스 트랙으로 제공됩니다. 안심하고 사용하세요.',
  },
]

const marqueeWords = [
  '딸기 케이크',
  '크림 흘러내리기',
  '한옥 카페',
  '단면 컷',
  'AI 생성',
  '60초 광고',
  '레트로 무드',
  '피크닉 분위기',
  '아메리카노',
]

/* ───────── 보조 ───────── */

function Tick({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-linear-to-br from-brand-400 to-orange-500 text-[10px] font-extrabold text-white shadow-sm">
        ✓
      </span>
      {children}
    </span>
  )
}
