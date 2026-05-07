import { Link, useNavigate } from 'react-router-dom'
import { Play, Plus } from 'lucide-react'

interface VideoItem {
  id: string
  title: string
  createdAt: string
  color: string
}

const videos: VideoItem[] = [
  {
    id: '1',
    title: '봄날의 브런치 카페 탐방',
    createdAt: '2023. 04. 12',
    color: 'from-amber-700 to-amber-900',
  },
  {
    id: '2',
    title: '홈카페 라떼 아트 도전',
    createdAt: '2023. 04. 10',
    color: 'from-yellow-800 to-stone-900',
  },
  {
    id: '3',
    title: '나만의 원두 블렌딩 레시피',
    createdAt: '2023. 03. 28',
    color: 'from-stone-700 to-stone-900',
  },
  {
    id: '4',
    title: '말차 디저트의 모든 것',
    createdAt: '2023. 04. 05',
    color: 'from-green-600 to-green-800',
  },
]

export default function MyVideosPage() {
  const navigate = useNavigate()

  return (
    <div className="relative px-5 pb-24 pt-5 md:pb-8">
      <h1 className="mb-4 text-xl font-bold">내 영상</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {videos.map((v) => (
          <Link
            key={v.id}
            to={`/videos/${v.id}`}
            className="group flex flex-col gap-1"
          >
            <div
              className={`relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br ${v.color}`}
            >
              <div className="absolute inset-0 bg-black/20" />
              <button
                type="button"
                aria-label="재생"
                className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
              >
                <Play className="h-4 w-4 fill-brand-500 text-brand-500" />
              </button>
            </div>
            <p className="mt-1 line-clamp-1 text-sm font-medium text-gray-800">
              {v.title}
            </p>
            <p className="text-xs text-gray-400">{v.createdAt}</p>
          </Link>
        ))}
      </div>

      {/* 모바일 전용 FAB — 데스크톱은 사이드 네비의 "생성하기" 메뉴로 대체 */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed bottom-[88px] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 active:scale-95 md:hidden"
      >
        <Plus className="h-4 w-4" />새 영상 만들기
      </button>
    </div>
  )
}
