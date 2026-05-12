import { Loader2 } from 'lucide-react'
import { useAuthedBlobUrl } from '@/shared/hooks/useAuthedBlobUrl'

/**
 * 인증이 필요한 BE 의 /files/* 엔드포인트에서 이미지를 받아 렌더.
 * 내부적으로 fetch + blob URL 변환 (Authorization 헤더 자동 첨부).
 *
 * loading / error 상태는 자체적으로 처리하므로 호출 쪽은 src 만 넘기면 됨.
 */
interface AuthedImageProps {
  src: string | undefined | null
  alt?: string
  className?: string
  /** 이미지가 로드되기 전 보여줄 fallback className (기본: 회색 펄스 스켈레톤). */
  fallbackClassName?: string
}

export function AuthedImage({
  src,
  alt,
  className = '',
  fallbackClassName,
}: AuthedImageProps) {
  const { blobUrl, loading, error } = useAuthedBlobUrl(src)

  if (!src) return null

  if (loading) {
    return (
      <div
        className={
          fallbackClassName ??
          `${className} flex animate-pulse items-center justify-center bg-gray-100`
        }
      >
        <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
      </div>
    )
  }

  if (error || !blobUrl) {
    return (
      <div
        className={
          fallbackClassName ??
          `${className} flex items-center justify-center bg-gray-100 text-xs text-gray-400`
        }
      >
        이미지 없음
      </div>
    )
  }

  return <img src={blobUrl} alt={alt} className={className} />
}

/**
 * 인증이 필요한 BE 의 /files/videos/{id} 에서 영상을 받아 재생.
 */
interface AuthedVideoProps {
  src: string | undefined | null
  className?: string
  controls?: boolean
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  poster?: string
}

export function AuthedVideo({
  src,
  className = '',
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  poster,
}: AuthedVideoProps) {
  const { blobUrl, loading, error } = useAuthedBlobUrl(src)

  if (!src) return null

  if (loading) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-black/80`}
      >
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }

  if (error || !blobUrl) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-black text-sm text-white/60`}
      >
        영상을 불러오지 못했습니다.
      </div>
    )
  }

  return (
    <video
      src={blobUrl}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      poster={poster}
      playsInline
    />
  )
}
