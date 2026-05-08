import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Sparkles } from 'lucide-react'
import Button from '@/shared/components/Button'

const ASSET = (file: string) => `${import.meta.env.BASE_URL}${file}`

interface Simulation {
  id: string
  label: string
  image: string
}

const simulations: Simulation[] = [
  { id: 'flow', label: '크림 흘러내리기', image: ASSET('flow.png') },
  { id: 'chop', label: '포크로 단면 자르기', image: ASSET('chop.png') },
  { id: 'divine', label: '반으로 가르기', image: ASSET('divine.png') },
]

const textures = ['촉촉함', '꾸덕함', '바삭함', '쫀득함', '폭신함']

interface Background {
  id: string
  label: string
  image: string
}

const backgrounds: Background[] = [
  { id: 'hanok', label: '한옥 카페', image: ASSET('hanok.png') },
  { id: 'retro', label: '레트로 카페', image: ASSET('retro.png') },
  { id: 'wood', label: '우드 데스크', image: ASSET('wood.png') },
  { id: 'picnic', label: '피크닉', image: ASSET('picnic.png') },
  { id: 'home', label: '홈', image: ASSET('home.png') },
  { id: 'office', label: '오피스', image: ASSET('office.png') },
]

export default function CreateVideoPage() {
  const navigate = useNavigate()
  const [selectedSim, setSelectedSim] = useState<string | null>(null)
  const [selectedTexture, setSelectedTexture] = useState<string | null>(null)
  const [selectedBg, setSelectedBg] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')

  // 세 가지 모두 선택돼야 생성 버튼 활성화
  const canCreate = !!selectedSim && !!selectedTexture && !!selectedBg

  const handleCreate = () => {
    if (!canCreate) return
    console.log('생성 시작', {
      selectedSim,
      selectedTexture,
      selectedBg,
      prompt,
    })
    navigate('/creating')
  }

  return (
    // flex-1: main 의 가시 영역 전체를 채워 CTA 가 항상 viewport 하단에 오도록.
    // mt-auto on CTA: 콘텐츠가 짧을 때 CTA 를 컨테이너 끝까지 밀어내림.
    <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-5">
      <h1 className="text-xl font-bold text-gray-900">영상 만들기</h1>

      {/* 메뉴 사진 업로드 */}
      <Section title="메뉴 사진 업로드">
        <button
          type="button"
          className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 transition hover:border-brand-300 hover:bg-brand-50"
        >
          <Camera className="h-8 w-8 text-gray-400" />
          <span className="text-sm">여기를 눌러 메뉴 사진을 추가하세요</span>
        </button>
      </Section>

      {/* 시뮬레이션 선택 — 모바일 세로 1열, 데스크톱 가로 3열 */}
      <Section title="시뮬레이션 선택">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {simulations.map((sim) => {
            const isActive = selectedSim === sim.id
            return (
              <button
                key={sim.id}
                type="button"
                onClick={() => setSelectedSim(sim.id)}
                className={`relative flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-200 p-4 text-white transition md:h-32 ${
                  isActive ? 'ring-2 ring-brand-500 ring-offset-2' : ''
                }`}
                style={{
                  backgroundImage: `url(${sim.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* 검은색 35% 오버레이 — 글자 가독성 확보 */}
                <span className="absolute inset-0 bg-black/35" />
                <span className="relative text-base font-semibold drop-shadow-md">
                  {sim.label}
                </span>
                {isActive && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs text-white">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Section>

      {/* 식감 표현 — 단일 선택, 모바일 3개씩 가로 정렬 */}
      <Section title="식감 표현">
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
          {textures.map((t) => {
            const active = selectedTexture === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTexture(t)}
                className={`rounded-full border px-3 py-2 text-center text-sm font-medium transition ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t}
              </button>
            )
          })}
        </div>
      </Section>

      {/* 배경 설정 — 단일 선택, 모바일 2개 / 데스크톱 3개 */}
      <Section title="배경 설정">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {backgrounds.map((bg) => {
            const isActive = selectedBg === bg.id
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() => setSelectedBg(bg.id)}
                className={`relative flex aspect-2/1 items-center justify-center overflow-hidden rounded-2xl bg-gray-200 p-3 text-white transition ${
                  isActive ? 'ring-2 ring-brand-500 ring-offset-2' : ''
                }`}
                style={{
                  backgroundImage: `url(${bg.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <span className="absolute inset-0 bg-black/35" />
                <span className="relative text-base font-semibold drop-shadow-md">
                  {bg.label}
                </span>
                {isActive && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Section>

      {/* 추가 프롬프트 */}
      <Section title="추가 프롬프트 (선택)">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="추가하고 싶은 구체적인 연출이 있다면 입력해주세요 (예: 딸기 토핑이 떨어지는 모습)"
          rows={3}
          className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </Section>

      {/*
        '영상 생성하기' CTA — mt-auto 로 항상 콘텐츠 끝(컨테이너 하단)에 위치.
        sticky bottom-0 으로 스크롤 시에도 viewport 하단에 고정.
        세 가지(시뮬레이션/식감/배경) 모두 선택해야 활성화.
      */}
      <div className="sticky bottom-0 -mx-5 mt-auto border-t border-gray-100 bg-white/95 px-5 py-3 backdrop-blur">
        <Button
          size="lg"
          fullWidth
          onClick={handleCreate}
          disabled={!canCreate}
        >
          <Sparkles className="h-4 w-4" />
          {canCreate
            ? '영상 생성하기 (1 젬)'
            : '시뮬레이션·식감·배경을 모두 선택해주세요'}
        </Button>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </section>
  )
}
