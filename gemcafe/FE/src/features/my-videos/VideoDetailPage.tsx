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
      {/* 비디오 플레이어 자리 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'linear-gradient(135deg, #000 0%, #FF6A00 45%, #FFA152 65%, #000 100%)',
            mixBlendMode: 'screen',
          }}
        />
        <button
          type="button"
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-xl transition hover:scale-105"
        >
          <Play className="h-8 w-8 fill-brand-500 text-brand-500" />
        </button>
      </div>

      {/* 정보 + 액션 */}
      <div className="space-y-4 px-5 py-5">
        <div>
          <h1 className="text-xl font-bold">{mockVideo.title}</h1>
          <p className="mt-1 text-xs text-gray-500">{mockVideo.meta}</p>
        </div>
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
