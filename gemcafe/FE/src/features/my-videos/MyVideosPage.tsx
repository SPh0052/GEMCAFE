import { Link, useNavigate } from 'react-router-dom'
import { Play, Plus } from 'lucide-react'

interface VideoItem {
  id: string
  title: string
  createdAt: string
  color: string
}

const palettes = [
  'from-amber-700 to-amber-900',
  'from-yellow-800 to-stone-900',
  'from-stone-700 to-stone-900',
  'from-green-600 to-green-800',
  'from-orange-500 to-red-700',
  'from-rose-600 to-rose-900',
  'from-sky-700 to-indigo-900',
  'from-emerald-600 to-emerald-900',
]

const titles = [
  '봄날의 브런치 카페 탐방',
  '홈카페 라떼 아트 도전',
  '나만의 원두 블렌딩 레시피',
  '말차 디저트의 모든 것',
  '딸기 생크림 케이크 클로즈업',
  '쿠키 반으로 가르기 영상',
  '시그니처 음료 시뮬레이션',
  '플레이팅 디테일 컷',
]

// 8개 mock 영상 — 일반 스크롤로 한 번에 표시
const videos: VideoItem[] = titles.map((title, i) => ({
  id: String(i + 1),
  title,
  createdAt: `2024. 0${(i % 6) + 1}. ${String((i % 28) + 1).padStart(2, '0')}`,
  color: palettes[i % palettes.length],
}))

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
              className={`relative aspect-9/16 overflow-hidden rounded-2xl bg-linear-to-br ${v.color}`}
            >
              <div className="absolute inset-0 bg-black/20" />
              {/* 영상 제목 — 좌상단 오버레이 (인스타 릴스 느낌) */}
              <p className="absolute left-3 top-3 right-3 line-clamp-2 text-xs font-semibold leading-tight text-white drop-shadow-md">
                {v.title}
              </p>
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

      {/* 모바일 전용 FAB */}
      <button
        type="button"
        onClick={() => navigate('/create')}
        className="fixed bottom-22 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 active:scale-95 md:hidden"
      >
        <Plus className="h-4 w-4" />새 영상 만들기
      </button>
    </div>
  )
}
