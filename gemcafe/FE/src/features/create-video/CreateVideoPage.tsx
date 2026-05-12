import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import Button from '@/shared/components/Button'
import { extractErrorMessage } from '@/shared/lib/errors'
import {
  analyzeCakeImage,
  createVideo,
  generateKeyframe,
  generatePreviewPrompt,
  selectKeyframe,
  type KeyframeResult,
} from './api'
import {
  BACKGROUNDS,
  FOCUSES,
  simulationsForFocus,
} from './catalog'

const MAX_KEYFRAME_ATTEMPTS = 3
const GEM_COST = 6

export default function CreateVideoPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Step 1: 이미지 + analyze ──
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)

  // ── Step 2~6: 선택값 (catalog 키 기반) ──
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [simulationCode, setSimulationCode] = useState<string | null>(null)
  const [backgroundCode, setBackgroundCode] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')

  // ── Step 7: 키프레임 ──
  const [keyframes, setKeyframes] = useState<KeyframeResult[]>([])
  const [generatingKeyframe, setGeneratingKeyframe] = useState(false)
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<number | null>(
    null,
  )

  // ── Step 8: 영상 생성 ──
  const [creatingVideo, setCreatingVideo] = useState(false)

  // ── 자동 프롬프트 생성 ──
  const [autoPrompt, setAutoPrompt] = useState('')
  const [generatingPrompt, setGeneratingPrompt] = useState(false)

  const [error, setError] = useState<string | null>(null)

  // focus 선택값에 맞는 시뮬레이션만 필터링
  const availableSimulations = useMemo(
    () => simulationsForFocus(focusKey),
    [focusKey],
  )

  const attemptsLeft = MAX_KEYFRAME_ATTEMPTS - keyframes.length
  const canGenerateKeyframe =
    !!sessionId &&
    !!simulationCode &&
    !!backgroundCode &&
    !!focusKey &&
    attemptsLeft > 0 &&
    !generatingKeyframe
  const canCreateVideo =
    !!sessionId && !!selectedKeyframeId && !creatingVideo && !generatingKeyframe
  const canGeneratePrompt =
    !!sessionId &&
    !!simulationCode &&
    !!backgroundCode &&
    !!focusKey &&
    !generatingPrompt

  const handleImagePick = () => fileInputRef.current?.click()

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일 재선택 가능하도록 초기화
    if (!file) return

    // 새 이미지 선택 시 이전 결과 초기화
    setImagePreview(URL.createObjectURL(file))
    setSessionId(null)
    setFocusKey(null)
    setSimulationCode(null)
    setBackgroundCode(null)
    setKeyframes([])
    setSelectedKeyframeId(null)
    setAutoPrompt('')
    setError(null)

    setAnalyzing(true)
    try {
      const res = await analyzeCakeImage(file)
      console.log('[POST /cakes/analyze] response:', res)
      setSessionId(res.sessionId)
    } catch (err) {
      console.error('[POST /cakes/analyze] error:', err)
      setError(extractErrorMessage(err, '이미지 분석에 실패했습니다.'))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGenerateKeyframe = async () => {
    if (
      !canGenerateKeyframe ||
      !sessionId ||
      !simulationCode ||
      !backgroundCode
    )
      return
    setError(null)
    setGeneratingKeyframe(true)
    try {
      const res = await generateKeyframe(sessionId, {
        simulationCode,
        backgroundCode,
        focus: focusKey ?? '',
        hint: prompt,
      })
      console.log('[POST /cakes/sessions/.../keyframes] response:', res)
      setKeyframes((prev) => [...prev, res])
    } catch (err) {
      console.error('[POST /cakes/sessions/.../keyframes] error:', err)
      setError(extractErrorMessage(err, '키프레임 생성에 실패했습니다.'))
    } finally {
      setGeneratingKeyframe(false)
    }
  }

  const handleGeneratePrompt = async () => {
    if (!canGeneratePrompt || !sessionId || !simulationCode || !backgroundCode)
      return
    setError(null)
    setGeneratingPrompt(true)
    try {
      const res = await generatePreviewPrompt(sessionId, {
        simulationCode,
        backgroundCode,
        focus: focusKey ?? '',
        hint: prompt,
      })
      console.log('[POST /cakes/sessions/.../preview-prompts] response:', res)
      setAutoPrompt(res.videoPromptKr)
    } catch (err) {
      console.error('[POST /cakes/sessions/.../preview-prompts] error:', err)
      setError(extractErrorMessage(err, '자동 프롬프트 생성에 실패했습니다.'))
    } finally {
      setGeneratingPrompt(false)
    }
  }

  const handleCreateVideo = async () => {
    if (!canCreateVideo || !sessionId || !selectedKeyframeId) return
    setError(null)
    setCreatingVideo(true)
    try {
      // select-keyframe 에 videoPromptKr 필수. 자동 생성 결과(autoPrompt) 우선,
      // 없으면 사용자가 입력한 hint(prompt) 로 fallback.
      const videoPromptKr = (autoPrompt || prompt).trim()
      await selectKeyframe(sessionId, {
        keyframeId: selectedKeyframeId,
        videoPromptKr,
      })
      const res = await createVideo(sessionId, prompt)
      console.log('[POST /videos] response:', res)
      navigate('/creating', { state: { videoId: res.videoId } })
    } catch (err) {
      console.error('[POST /videos] error:', err)
      setError(extractErrorMessage(err, '영상 생성 시작에 실패했습니다.'))
      setCreatingVideo(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-5">
      <h1 className="text-xl font-bold text-gray-900">영상 만들기</h1>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 메뉴 사진 업로드 */}
      <Section title="메뉴 사진 업로드">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
        <button
          type="button"
          onClick={handleImagePick}
          disabled={analyzing}
          className="relative flex h-44 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {imagePreview ? (
            <>
              <img
                src={imagePreview}
                alt="업로드한 케이크"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {analyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">이미지 분석 중...</span>
                </div>
              )}
              {!analyzing && (
                <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
                  다시 선택
                </span>
              )}
            </>
          ) : (
            <>
              <Camera className="h-8 w-8 text-gray-400" />
              <span className="text-sm">여기를 눌러 메뉴 사진을 추가하세요</span>
            </>
          )}
        </button>
      </Section>

      {/* 요소 선택 — 카탈로그 3개 (분석 완료 후에만 노출) */}
      {sessionId && (
        <Section title="강조할 요소 (1개 선택)">
          <div className="grid grid-cols-3 gap-2">
            {FOCUSES.map((f) => {
              const active = focusKey === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setFocusKey(f.key)
                    // 요소 바뀌면 호환 안 되는 시뮬레이션 선택 초기화
                    setSimulationCode((cur) => {
                      if (!cur) return null
                      return f.applicable_simulations.includes(cur) ? cur : null
                    })
                  }}
                  className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f.label_kr}
                </button>
              )
            })}
          </div>

        </Section>
      )}

      {/* 시뮬레이션 선택 — focus 선택 후 노출 */}
      {focusKey && availableSimulations.length > 0 && (
        <Section title="시뮬레이션 선택">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {availableSimulations.map((sim) => {
              const isActive = simulationCode === sim.key
              return (
                <button
                  key={sim.key}
                  type="button"
                  onClick={() => setSimulationCode(sim.key)}
                  className={`relative flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-200 p-4 text-white transition md:h-32 ${
                    isActive ? 'ring-2 ring-brand-500 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundImage: sim.image ? `url(${sim.image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <span className="absolute inset-0 bg-black/35" />
                  <span className="relative text-base font-semibold drop-shadow-md">
                    {sim.label_kr}
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
      )}

      {/* 배경 설정 — 시뮬레이션 선택 후 노출 */}
      {simulationCode && (
        <Section title="배경 설정">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {BACKGROUNDS.map((bg) => {
              const isActive = backgroundCode === bg.key
              return (
                <button
                  key={bg.key}
                  type="button"
                  onClick={() => setBackgroundCode(bg.key)}
                  className={`relative flex aspect-2/1 items-center justify-center overflow-hidden rounded-2xl bg-gray-200 p-3 text-white transition ${
                    isActive ? 'ring-2 ring-brand-500 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundImage: bg.image ? `url(${bg.image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <span className="absolute inset-0 bg-black/35" />
                  <span className="relative text-base font-semibold drop-shadow-md">
                    {bg.label_kr}
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
      )}

      {/* 추가 프롬프트 (hint) */}
      <Section title="추가 프롬프트 (선택)">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="추가하고 싶은 구체적인 연출이 있다면 입력해주세요 (예: 딸기 토핑이 떨어지는 모습)"
          rows={3}
          className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />

        <div className="mt-3">
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={handleGeneratePrompt}
            disabled={!canGeneratePrompt}
          >
            {generatingPrompt ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {generatingPrompt
              ? '프롬프트 생성 중...'
              : '자동 프롬프트 생성'}
          </Button>

          {!canGeneratePrompt && !generatingPrompt && (
            <p className="mt-2 text-xs text-gray-400">
              메뉴 사진 업로드 후 강조 포인트·시뮬레이션·배경을 모두 선택해주세요.
            </p>
          )}

          {autoPrompt && (
            <textarea
              value={autoPrompt}
              onChange={(e) => setAutoPrompt(e.target.value)}
              rows={3}
              className="mt-3 w-full resize-none rounded-2xl border border-brand-200 bg-brand-50/40 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          )}
        </div>
      </Section>

      {/* 키프레임 생성하기 */}
      <Section title={`키프레임 생성 (${keyframes.length}/${MAX_KEYFRAME_ATTEMPTS})`}>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          onClick={handleGenerateKeyframe}
          disabled={!canGenerateKeyframe}
        >
          {generatingKeyframe ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {generatingKeyframe
            ? '키프레임 생성 중...'
            : keyframes.length === 0
              ? '키프레임 생성하기'
              : attemptsLeft > 0
                ? `다시 생성하기 (${attemptsLeft}회 남음)`
                : '생성 횟수 모두 사용'}
        </Button>

        {!sessionId && (
          <p className="mt-2 text-xs text-gray-400">
            메뉴 사진을 업로드해야 키프레임을 생성할 수 있어요.
          </p>
        )}
        {sessionId &&
          (!focusKey || !simulationCode || !backgroundCode) && (
            <p className="mt-2 text-xs text-gray-400">
              강조할 요소·시뮬레이션·배경을 모두 선택해주세요.
            </p>
          )}

        {keyframes.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {keyframes.map((kf) => {
              const active = selectedKeyframeId === kf.keyframeId
              return (
                <button
                  key={kf.keyframeId}
                  type="button"
                  onClick={() => setSelectedKeyframeId(kf.keyframeId)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                    active
                      ? 'border-brand-500 ring-2 ring-brand-200'
                      : 'border-gray-200 hover:border-brand-300'
                  }`}
                >
                  <img
                    src={kf.keyframeUrl}
                    alt={`키프레임 ${kf.attemptNumber}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
                    {kf.attemptNumber}회차
                  </span>
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </Section>

      {/* 영상 생성하기 CTA */}
      <div className="sticky bottom-0 -mx-5 mt-auto border-t border-gray-100 bg-white/95 px-5 py-3 backdrop-blur">
        <Button
          size="lg"
          fullWidth
          onClick={handleCreateVideo}
          disabled={!canCreateVideo}
        >
          {creatingVideo ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {creatingVideo
            ? '영상 생성 요청 중...'
            : canCreateVideo
              ? `영상 생성하기 (${GEM_COST} 젬)`
              : '키프레임을 선택해주세요'}
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
