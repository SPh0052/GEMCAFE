import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Sparkles } from 'lucide-react'
import Button from '@/shared/components/Button'

const simulations = [
  { id: 'cream', label: '크림 흘러내리기', emoji: '🥛' },
  { id: 'cake', label: '케이크 단면', emoji: '🍰' },
  { id: 'cookie', label: '쿠키 반으로 가르기', emoji: '🍪' },
]

const textures = ['촉촉함', '꾸덕함', '바삭함', '쫀득함', '폭신함']

const backgrounds = [
  { id: 'hanok', label: '한옥 카페', color: 'from-amber-200 to-amber-300' },
  { id: 'retro', label: '레트로 카페', color: 'from-orange-200 to-orange-300' },
  { id: 'wood', label: '우드 데스크', color: 'from-amber-300 to-orange-400' },
  { id: 'picnic', label: '피크닉', color: 'from-lime-200 to-green-300' },
  { id: 'home', label: '홈', color: 'from-gray-100 to-gray-200' },
  { id: 'office', label: '오피스', color: 'from-slate-200 to-slate-300' },
]

export default function CreateVideoPage() {
  const navigate = useNavigate()
  const [selectedSim, setSelectedSim] = useState('cake')
  const [selectedTextures, setSelectedTextures] = useState<string[]>(['꾸덕함'])
  const [selectedBg, setSelectedBg] = useState('wood')
  const [prompt, setPrompt] = useState('')

  const toggleTexture = (t: string) => {
    setSelectedTextures((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    )
  }

  const handleCreate = () => {
    console.log('생성 시작', { selectedSim, selectedTextures, selectedBg, prompt })
    navigate('/creating')
  }

  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-5">
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

      {/* 시뮬레이션 선택 */}
      <Section title="시뮬레이션 선택">
        <div className="grid grid-cols-3 gap-3">
          {simulations.map((sim) => (
            <button
              key={sim.id}
              type="button"
              onClick={() => setSelectedSim(sim.id)}
              className={`flex aspect-square flex-col items-center justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 p-3 text-white transition md:aspect-2/1 ${
                selectedSim === sim.id
                  ? 'ring-2 ring-brand-500 ring-offset-2'
                  : ''
              }`}
            >
              <span className="text-3xl">{sim.emoji}</span>
              <span className="mt-auto text-xs font-medium">{sim.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* 식감 표현 */}
      <Section title="식감 표현">
        <div className="flex flex-wrap gap-2">
          {textures.map((t) => {
            const active = selectedTextures.includes(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTexture(t)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
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

      {/* 배경 설정 */}
      <Section title="배경 설정">
        <div className="grid grid-cols-3 gap-3">
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => setSelectedBg(bg.id)}
              className={`relative flex h-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${bg.color} font-medium text-gray-800 transition ${
                selectedBg === bg.id ? 'ring-2 ring-brand-500 ring-offset-2' : ''
              }`}
            >
              <span className="text-sm">{bg.label}</span>
              {selectedBg === bg.id && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
                  ✓
                </span>
              )}
            </button>
          ))}
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
        '영상 생성하기' CTA — sticky 로 main 스크롤 컨테이너 하단에 고정.
        모바일에선 BottomNav 가 main 의 sibling 이라 sticky bottom-0 가
        자연스럽게 BottomNav 바로 위 위치에 멈춤. 데스크톱은 viewport 하단.
      */}
      <div className="sticky bottom-0 -mx-5 mt-2 border-t border-gray-100 bg-white/95 px-5 py-3 backdrop-blur">
        <Button size="lg" fullWidth onClick={handleCreate}>
          <Sparkles className="h-4 w-4" />
          영상 생성하기 (1 젬)
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
