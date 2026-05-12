import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Download, Loader2, Pencil, Share2 } from 'lucide-react'
import Button from '@/shared/components/Button'
import { AuthedVideo } from '@/shared/components/AuthedMedia'
import { api } from '@/shared/lib/axios'
import { getVideoDetail, type VideoDetail } from './api'

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const videoId = id ? Number(id) : NaN

  const [detail, setDetail] = useState<VideoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  // 토스트 자동 해제
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  // 영상 상세 조회
  useEffect(() => {
    if (!Number.isFinite(videoId)) {
      setError('잘못된 영상 ID 입니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    getVideoDetail(videoId)
      .then((res) => {
        console.log('[GET /videos/{id}] response:', res)
        if (cancelled) return
        setDetail(res)
      })
      .catch((err) => {
        console.error('[GET /videos/{id}] error:', err)
        if (cancelled) return

        // BE 정의 에러 코드 별 UX 분기
        // - 404 VIDEO-001: 영상 없음 / 403 AUTH-004: 남의 영상 — 동일 메시지(정보 노출 방지)
        // - 400 VIDEO-003: 아직 생성 중 — 진행 페이지로 redirect
        // - 401: axios 인터셉터가 refresh 자동 처리
        if (axios.isAxiosError(err)) {
          const status = err.response?.status
          if (status === 404 || status === 403) {
            setError('영상을 찾을 수 없습니다.')
            return
          }
          if (status === 400) {
            // 아직 생성 중 → 진행상태 화면으로
            navigate('/creating', {
              state: { videoId },
              replace: true,
            })
            return
          }
        }
        setError('영상을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [videoId])

  const shareUrl =
    typeof window !== 'undefined' && detail
      ? `${window.location.origin}/videos/${detail.videoId}`
      : ''
  const shareTitle = detail ? `${detail.title} — gem.cafe` : 'gem.cafe'
  const shareText = detail
    ? `${detail.title} 영상을 확인해보세요!`
    : 'gem.cafe 영상'

  /**
   * 인증 보호 경로의 영상을 blob 으로 받아온다.
   * 다운로드·공유에서 공통 사용.
   */
  const fetchVideoBlob = async (url: string): Promise<Blob> => {
    // /dev/files/* 같은 origin-relative 경로는 baseURL 우회
    const useOriginBase = /^\/dev\//.test(url)
    const res = await api.get<Blob>(url, {
      responseType: 'blob',
      ...(useOriginBase ? { baseURL: '' } : {}),
    })
    return res.data
  }

  const handleEdit = () => {
    if (!detail) return
    // 편집기로 영상 정보 전달 — VideoEditor 가 업로드 단계 건너뛰고 바로 편집 가능
    navigate('/editor', {
      state: {
        videoId: detail.videoId,
        title: detail.title,
        videoUrl: detail.videoUrl,
        thumbnailUrl: detail.thumbnailUrl,
      },
    })
  }

  const handleDownload = async () => {
    if (!detail || downloading) return
    setDownloading(true)
    try {
      const blob = await fetchVideoBlob(detail.videoUrl)
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = `${detail.title || 'gemcafe'}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)
    } catch (err) {
      console.error('[VideoDetail] 다운로드 실패', err)
      setToast('다운로드에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (!detail) return

    // 1) 파일 공유 시도 — blob 으로 받아서 file 첨부
    if ('canShare' in navigator) {
      try {
        const blob = await fetchVideoBlob(detail.videoUrl)
        const file = new File([blob], `${detail.title}.mp4`, {
          type: blob.type || 'video/mp4',
        })
        const filePayload = {
          files: [file],
          title: shareTitle,
          text: shareText,
        }
        if (navigator.canShare(filePayload)) {
          await navigator.share(filePayload)
          return
        }
      } catch (err) {
        console.warn('[VideoDetail] 파일 공유 실패, URL 공유로 fallback', err)
      }
    }

    // 2) URL/텍스트 공유
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
        return
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.warn(
          '[VideoDetail] Web Share API 실패, 클립보드 복사로 fallback',
          err,
        )
      }
    }

    // 3) 클립보드 복사 fallback
    try {
      await navigator.clipboard.writeText(shareUrl)
      setToast('링크가 복사되었습니다.')
    } catch (err) {
      console.error('[VideoDetail] 클립보드 복사 실패', err)
      setToast('공유에 실패했습니다.')
    }
  }

  // ── 로딩 / 에러 ──
  if (loading) {
    return (
      <div className="flex h-full min-h-full flex-1 items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex h-full min-h-full flex-1 flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-sm text-white/80">{error ?? '데이터가 없습니다.'}</p>
        <button
          type="button"
          onClick={() => navigate('/videos')}
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur"
        >
          내 영상으로
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-full flex-1 flex-col">
      {/* 비디오 플레이어 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        <div className="relative h-full max-h-full" style={{ aspectRatio: '9 / 16' }}>
          <AuthedVideo
            src={detail.videoUrl}
            className="h-full w-full object-contain"
            controls
          />

          {/* 제목 — 좌상단 오버레이 */}
          <div className="pointer-events-none absolute left-4 right-16 top-4 z-10">
            <h1 className="text-base font-bold leading-tight text-white drop-shadow-md sm:text-lg">
              {detail.title}
            </h1>
            <p className="mt-1 text-[11px] text-white/80 drop-shadow">
              AI 생성 영상 · {formatDate(detail.createdAt)}
            </p>
          </div>

          {/* 다운로드 — 우상단 아이콘 */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="영상 다운로드"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            편집하기
          </Button>
          <Button size="lg" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            공유하기
          </Button>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
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
