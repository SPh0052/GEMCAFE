import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Film, Loader2, Play, Sparkles } from 'lucide-react'
import { AuthedImage } from '@/shared/components/AuthedMedia'
import { extractErrorMessage } from '@/shared/lib/errors'
import { getMyVideos, type VideoListItem } from '@/features/my-videos/api'

const PAGE_SIZE = 12

/**
 * 영상 생성하기 진입 페이지 — 사용자가 만든 영상 목록 + 우상단 "영상 만들기" 버튼.
 * 실제 영상 생성 흐름은 /create/new (CreateVideoPage).
 */
export default function CreateLandingPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<VideoListItem[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [hasNext, setHasNext] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)

  const loadNext = useCallback(
    async (resetCursor?: number | null) => {
      if (loadingRef.current) return
      const useCursor = resetCursor === undefined ? cursor : resetCursor
      if (useCursor != null && !hasNext) return

      loadingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const page = await getMyVideos(useCursor ?? undefined, PAGE_SIZE)
        console.log('[GET /videos] response:', page)
        setVideos((prev) =>
          useCursor == null ? page.items : [...prev, ...page.items],
        )
        setCursor(page.nextCursor ?? null)
        setHasNext(page.hasNext)
      } catch (err) {
        console.error('[GET /videos] error:', err)
        setError(extractErrorMessage(err, '영상 목록을 불러오지 못했습니다.'))
      } finally {
        loadingRef.current = false
        setLoading(false)
        setInitialLoading(false)
      }
    },
    [cursor, hasNext],
  )

  useEffect(() => {
    loadNext(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (!hasNext) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNext && !loadingRef.current) {
          loadNext()
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadNext, hasNext])

  return (
    <div className="relative flex flex-col gap-5 px-5 pb-24 pt-6 md:pb-8">
      {/* 헤더 — 좌측 타이틀, 우상단 영상 만들기 버튼 */}
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
        {!initialLoading && (
          <p className="mt-2 text-xs font-medium text-gray-400">
            지금까지 만든 영상 {videos.length}개{hasNext ? ' +' : ''}
          </p>
        )}
      </header>

      {/* 초기 로딩 */}
      {initialLoading && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* 에러 */}
      {!initialLoading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
          <button
            type="button"
            onClick={() => loadNext(null)}
            className="ml-2 underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 비어있을 때 — 위 우측 버튼은 그대로 두고 본문엔 안내 카드 */}
      {!initialLoading && !error && videos.length === 0 && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <Film className="h-7 w-7" />
          </span>
          <div>
            <div className="text-base font-bold text-gray-800">
              아직 만든 영상이 없어요
            </div>
            <div className="mt-1 text-sm text-gray-500">
              우측 상단 버튼으로 첫 영상을 만들어보세요.
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

      {/* 영상 그리드 */}
      {!initialLoading && videos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {videos.map((v) => (
            <Link
              key={v.videoId}
              to={`/videos/${v.videoId}`}
              className="group flex flex-col gap-2"
            >
              <div className="relative aspect-9/16 overflow-hidden rounded-2xl bg-gray-200 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-xl">
                <AuthedImage
                  src={v.thumbnailUrl}
                  alt={v.title}
                  className="h-full w-full object-cover"
                  fallbackClassName="h-full w-full bg-linear-to-br from-gray-300 to-gray-500"
                />
                <div className="absolute inset-0 bg-black/15 transition group-hover:bg-black/25" />
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
                <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition group-hover:scale-110">
                  <Play className="h-4 w-4 fill-brand-500 text-brand-500" />
                </span>
              </div>
              <div className="px-0.5">
                <p className="text-sm font-semibold text-gray-800 transition group-hover:text-brand-600">
                  {formatDate(v.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 무한 스크롤 sentinel */}
      {!initialLoading && hasNext && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-6 text-sm text-gray-400"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중...
            </span>
          ) : (
            <span className="h-px w-full max-w-32 bg-gray-200" />
          )}
        </div>
      )}

      {!initialLoading && !hasNext && videos.length > 0 && (
        <p className="py-4 text-center text-xs text-gray-400">
          모든 영상을 다 보셨어요.
        </p>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-9/16 animate-pulse rounded-2xl bg-gray-200" />
      <div className="space-y-1.5 px-0.5">
        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-gray-100" />
      </div>
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
