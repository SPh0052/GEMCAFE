import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Film, Loader2, Play, Sparkles } from 'lucide-react'
import { AuthedImage } from '@/shared/components/AuthedMedia'
import { extractErrorMessage } from '@/shared/lib/errors'
import { getMyVideos, type VideoListItem } from './api'

const PAGE_SIZE = 12

export default function MyVideosPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<VideoListItem[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [hasNext, setHasNext] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  // 동시 요청 방지 + StrictMode 의 effect 중복 fire 방어
  const loadingRef = useRef(false)

  /** 다음 페이지 로드. cursor 가 null 이면 첫 페이지. */
  const loadNext = useCallback(
    async (resetCursor?: number | null) => {
      if (loadingRef.current) return
      // resetCursor 가 전달되면 첫 페이지(null) 부터, 아니면 현재 cursor 다음
      const useCursor = resetCursor === undefined ? cursor : resetCursor
      // 첫 로드(null) 가 아니고 hasNext=false 면 종료
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

  // 첫 페이지 로드 (mount 시 1회)
  useEffect(() => {
    loadNext(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // IntersectionObserver — sentinel 이 viewport 에 들어오면 다음 페이지 로드
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
      { rootMargin: '200px' }, // viewport 바닥 200px 위에서 미리 로드
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadNext, hasNext])

  return (
    <div className="relative flex flex-col gap-5 px-5 pb-24 pt-6 md:pb-8">
      {/* ───── 헤더 ───── */}
      <header>
        <p className="text-sm font-medium text-brand-500">My Library</p>
        <div className="mt-1 flex items-end justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            내 영상
          </h1>
          {!initialLoading && (
            <span className="text-xs font-medium text-gray-400">
              {videos.length}개{hasNext ? ' +' : ''}
            </span>
          )}
        </div>
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

      {/* 비어있을 때 */}
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
              첫 영상을 만들어볼까요?
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

                {/* 호버 glow */}
                <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 opacity-0 blur-2xl transition group-hover:opacity-100" />

                {/* 재생 버튼 */}
                <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition group-hover:scale-110">
                  <Play className="h-4 w-4 fill-brand-500 text-brand-500" />
                </span>
              </div>
              <div className="px-0.5">
                <p className="line-clamp-1 text-sm font-semibold text-gray-800 transition group-hover:text-brand-600">
                  {v.title}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {formatDate(v.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 무한 스크롤 sentinel + 추가 로딩 */}
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

      {/* 끝까지 다 봤을 때 */}
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
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}
