import { Film } from 'lucide-react'

interface Props {
  src?: string
  className?: string
}

/**
 * 영상 썸네일. src 있으면 이미지, 없으면 회색 플레이스홀더(필름 아이콘).
 * 기본 사이즈 h-8 w-12 (48×32px). className으로 덮어쓰기 가능.
 */
export default function Thumbnail({ src, className = 'h-8 w-12' }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`shrink-0 rounded-md object-cover ring-1 ring-gray-200 ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-linear-to-br from-gray-200 to-gray-300 ring-1 ring-gray-200 ${className}`}
    >
      <Film className="h-1/2 w-1/2 text-gray-400" />
    </div>
  )
}
