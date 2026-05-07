import { useParams } from 'react-router-dom'
import { Download, Play, Share2 } from 'lucide-react'
import Button from '@/shared/components/Button'

const mockVideo = {
  id: '1',
  title: '딸기 생크림 케이크',
  meta: 'AI 생성 레시피 영상 • 00:45',
}

export default function VideoDetailPage() {
  useParams()

  return (
    <div className="flex flex-col">
      {/* 비디오 플레이어 자리 — 인스타 릴스 비율(9:16) + 제목 좌상단 오버레이 */}
      <div className="relative aspect-9/16 w-full overflow-hidden bg-black">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'linear-gradient(135deg, #000 0%, #FF6A00 45%, #FFA152 65%, #000 100%)',
            mixBlendMode: 'screen',
          }}
        />

        {/* 제목 — 좌상단 오버레이. 영상 위에 항상 표시되어 어떤 영상인지 즉시 식별 */}
        <div className="absolute left-4 right-16 top-4 z-10">
          <h1 className="text-base font-bold leading-tight text-white drop-shadow-md sm:text-lg">
            {mockVideo.title}
          </h1>
          <p className="mt-1 text-[11px] text-white/80 drop-shadow">
            {mockVideo.meta}
          </p>
        </div>

        <button
          type="button"
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-xl transition hover:scale-105"
        >
          <Play className="h-8 w-8 fill-brand-500 text-brand-500" />
        </button>
      </div>

      {/* 정보 + 액션 */}
      <div className="space-y-4 px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg">
            <Download className="h-4 w-4" />
            다운로드
          </Button>
          <Button size="lg">
            <Share2 className="h-4 w-4" />
            공유하기
          </Button>
        </div>
      </div>
    </div>
  )
}
