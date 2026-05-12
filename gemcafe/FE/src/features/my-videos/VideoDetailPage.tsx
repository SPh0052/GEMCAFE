import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Download, Pencil, Play, Share2 } from 'lucide-react'
import Button from '@/shared/components/Button'

const mockVideo = {
  id: '1',
  title: '딸기 생크림 케이크',
  meta: 'AI 생성 레시피 영상 • 00:45',
  // BE 붙으면 실제 영상 파일 URL 로 교체
  videoUrl: '',
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [toast, setToast] = useState<string | null>(null)

  // 토스트 자동 해제
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/videos/${id ?? mockVideo.id}`
      : ''
  const shareTitle = `${mockVideo.title} — gem.cafe`
  const shareText = `${mockVideo.title} 영상을 확인해보세요!`

  const handleEdit = () => {
    navigate('/editor', { state: { videoId: id ?? mockVideo.id } })
  }

  const handleDownload = async () => {
    if (!mockVideo.videoUrl) {
      // BE 미연동 — 임시로 토스트만
      setToast('영상 다운로드 준비 중입니다.')
      return
    }
    try {
      const res = await fetch(mockVideo.videoUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${mockVideo.title}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[VideoDetail] 다운로드 실패', err)
      setToast('다운로드에 실패했습니다.')
    }
  }

  const handleShare = async () => {
    // 1) 파일 공유 시도 — 영상 URL 있으면 blob 으로 받아서 file 첨부
    if (mockVideo.videoUrl && 'canShare' in navigator) {
      try {
        const res = await fetch(mockVideo.videoUrl)
        const blob = await res.blob()
        const file = new File([blob], `${mockVideo.title}.mp4`, {
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
        // 파일 공유 실패 → URL 공유로 fallback
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
        // 사용자 취소(AbortError)는 무시
        if (err instanceof Error && err.name === 'AbortError') return
        console.warn('[VideoDetail] Web Share API 실패, 클립보드 복사로 fallback', err)
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

  return (
    // 화면 전체 높이를 채우고 스크롤 없이 영상 + 액션 버튼 모두 보이도록 flex column.
    <div className="flex h-full min-h-full flex-1 flex-col">
      {/* 비디오 플레이어 — 남은 공간을 다 차지하면서 9:16 비율 유지 */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        <div
          className="relative h-full max-h-full"
          style={{ aspectRatio: '9 / 16' }}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                'linear-gradient(135deg, #000 0%, #FF6A00 45%, #FFA152 65%, #000 100%)',
              mixBlendMode: 'screen',
            }}
          />

          {/* 제목 — 좌상단 오버레이 */}
          <div className="absolute left-4 right-16 top-4 z-10">
            <h1 className="text-base font-bold leading-tight text-white drop-shadow-md sm:text-lg">
              {mockVideo.title}
            </h1>
            <p className="mt-1 text-[11px] text-white/80 drop-shadow">
              {mockVideo.meta}
            </p>
          </div>

          {/* 다운로드 — 우상단 아이콘 */}
          <button
            type="button"
            onClick={handleDownload}
            aria-label="영상 다운로드"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <Download className="h-4.5 w-4.5" />
          </button>

          {/* 재생 버튼 */}
          <button
            type="button"
            className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-xl transition hover:scale-105"
          >
            <Play className="h-8 w-8 fill-brand-500 text-brand-500" />
          </button>
        </div>
      </div>

      {/* 액션 버튼 — 하단 고정 영역 */}
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

      {/* 토스트 — 화면 하단 중앙 */}
      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
