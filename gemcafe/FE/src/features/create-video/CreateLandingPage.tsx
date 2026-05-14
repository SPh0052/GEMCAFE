import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, Sparkles } from 'lucide-react'
import { AuthedImage } from '@/shared/components/AuthedMedia'
import { extractErrorMessage } from '@/shared/lib/errors'
import { getInProgressSessions, type InProgressSession } from './api'

/**
 * 영상 만들기 진입 페이지 — 진행 중(미완성) 세션 목록 + 우상단 "영상 생성하기" 버튼.
 * 완성된 영상은 /videos (내 영상) 에서 봄. 여기는 "이어서 작업할 것" 만 노출.
 */
export default function CreateLandingPage() {
  const navigate = useNavigate()
  const [inProgress, setInProgress] = useState<InProgressSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getInProgressSessions()
      .then((res) => {
        if (cancelled) return
        console.log('[GET /cakes/sessions/in-progress] response:', res)
        setInProgress(res.items)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[GET /cakes/sessions/in-progress] 실패', err)
        setError(extractErrorMessage(err, '목록을 불러오지 못했어요.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative flex flex-col gap-5 px-5 pb-24 pt-6 md:pb-8">
      {/* 헤더 — 좌측 타이틀, 우상단 영상 생성하기 버튼 */}
      <header>
        <p className="text-sm font-medium text-brand-500">Create</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            영상 만들기
          </h1>
          <button
            type="button"
            onClick={() => navigate('/create/new')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-linear-to-br from-brand-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/30 transition hover:from-brand-600 hover:to-orange-600 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            영상 생성하기
          </button>
        </div>
        {!loading && (
          <p className="mt-2 text-xs font-medium text-gray-400">
            진행 중인 세션 {inProgress.length}개
          </p>
        )}
      </header>

      {/* 로딩 */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* 진행 중 세션 없음 */}
      {!loading && !error && inProgress.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Film className="h-7 w-7" />
          </span>
          <div>
            <div className="text-base font-bold text-gray-800">
              진행 중인 영상이 없어요
            </div>
            <div className="mt-1 text-sm text-gray-500">
              우측 상단 버튼으로 새 영상을 만들어보세요.
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/create/new')}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            <Sparkles className="h-4 w-4" />
            영상 만들기
          </button>
        </div>
      )}

      {/* 진행 중 세션 그리드 */}
      {!loading && !error && inProgress.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {inProgress.map((s) => (
            <button
              key={s.sessionId}
              type="button"
              onClick={() =>
                navigate('/create/new', { state: { sessionId: s.sessionId } })
              }
              className="group flex flex-col gap-2 text-left"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-200 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-xl">
                <AuthedImage
                  src={s.inputImage.url}
                  alt={s.inputImage.fileName}
                  className="h-full w-full object-cover"
                  fallbackClassName="h-full w-full bg-linear-to-br from-amber-100 to-orange-100"
                />
                <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/20" />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-500/95 px-2.5 py-1 text-[10px] font-bold text-white shadow">
                  {labelForStatus(s.status)}
                </span>
              </div>
              <div className="px-0.5">
                <p className="text-sm font-semibold text-gray-800 transition group-hover:text-brand-600">
                  {formatDate(s.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

function labelForStatus(status: string): string {
  switch (status) {
    case 'ANALYZED':
      return '분석 완료'
    case 'KEYFRAMING':
      return '키프레임'
    case 'READY_TO_GENERATE':
      return '생성 대기'
    default:
      return '진행 중'
  }
}
