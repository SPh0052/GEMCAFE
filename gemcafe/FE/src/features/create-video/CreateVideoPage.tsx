import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import Button from '@/shared/components/Button'
import { extractErrorMessage } from '@/shared/lib/errors'
import {
  analyzeCakeImage,
  createVideo,
  fetchAuthedImageAsBlobUrl,
  generateKeyframe,
  generatePreviewPrompt,
  getSessionDetail,
  selectKeyframe,
  updateSessionSelections,
  updateVideoPrompt,
  type CakeAnalysis,
  type KeyframeResult,
} from './api'
import {
  BACKGROUNDS,
  categoryForKeyword,
  keywordLabel,
  simulationsForCategory,
  normalizeSimulationCode,
  type FocusCategory,
} from './catalog'

const MAX_KEYFRAME_ATTEMPTS = 3
const GEM_COST = 6

interface CreateLocationState {
  /** CreateLandingPage 의 "이어서 만들기" 카드 클릭 시 전달되는 세션 ID */
  sessionId?: number
}

export default function CreateVideoPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const incomingSessionId =
    (location.state as CreateLocationState | null)?.sessionId
  const fileInputRef = useRef<HTMLInputElement>(null)
  /** 세션 복원 진행 중 — 그동안 입력 disable */
  const [restoring, setRestoring] = useState(!!incomingSessionId)

  // ── Step 1: 이미지 + analyze ──
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  /** analyze API 응답 — 추천 키워드 칩 렌더링과 카테고리 추론에 사용. */
  const [analysis, setAnalysis] = useState<CakeAnalysis | null>(null)

  // ── Step 2~6: 선택값 ──
  /** 사용자가 선택한 강조 키워드 (예: 'baked_cheese'). API focus 필드로 그대로 전송. */
  const [focusKey, setFocusKey] = useState<string | null>(null)
  /** focusKey 가 어느 카테고리(base/creams/toppings/coating)에서 왔는지 — 시뮬레이션 필터에 사용. */
  const [focusCategory, setFocusCategory] = useState<FocusCategory | null>(null)
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

  // ── 세션 복원 — location.state.sessionId 있으면 상세 fetch 해서 state 채움 ──
  useEffect(() => {
    if (!incomingSessionId) return
    let cancelled = false
    /** 복원 중 만든 blob URL — unmount 시 revoke (메모리 누수 방지) */
    let createdBlobUrl: string | null = null
    setRestoring(true)
    ;(async () => {
      try {
        const s = await getSessionDetail(incomingSessionId)
        if (cancelled) return
        console.log('[GET /cakes/sessions/{id}] response:', s)
        setSessionId(s.sessionId)
        // analysis 먼저 세팅 — focus 카테고리 추론에 필요
        const restoredAnalysis = (s.analysis ?? null) as CakeAnalysis | null
        setAnalysis(restoredAnalysis)
        if (s.selections?.focus) {
          setFocusKey(s.selections.focus)
          // 저장된 focus 가 analysis 의 어느 카테고리에서 왔는지 역추적
          setFocusCategory(
            categoryForKeyword(s.selections.focus, restoredAnalysis),
          )
        }
        if (s.selections?.simulationCode)
          setSimulationCode(normalizeSimulationCode(s.selections.simulationCode))
        // backgroundCode: 명시적 null 이면 "미선택" (UI 키 'none') 으로 매핑.
        const bg = s.selections?.backgroundCode
        if (typeof bg === 'string' && bg.length > 0) setBackgroundCode(bg)
        else if (bg === null) setBackgroundCode('none')
        if (s.selections?.hint) setPrompt(s.selections.hint)
        if (s.videoPromptKr) setAutoPrompt(s.videoPromptKr)
        // 키프레임 — SessionKeyframe → KeyframeResult 로 매핑
        const restoredKfs: KeyframeResult[] = s.keyframes.map((kf) => ({
          keyframeId: kf.keyframeId,
          attemptNumber: kf.attemptNumber,
          keyframeUrl: kf.keyframeUrl,
        }))
        setKeyframes(restoredKfs)
        if (s.selectedKeyframeId) setSelectedKeyframeId(s.selectedKeyframeId)

        // 입력 이미지 — axios 통해 blob URL 변환 (인증 헤더 + dev proxy 매핑 보장)
        if (s.inputImage?.url) {
          try {
            const blobUrl = await fetchAuthedImageAsBlobUrl(s.inputImage.url)
            if (cancelled) {
              URL.revokeObjectURL(blobUrl)
              return
            }
            createdBlobUrl = blobUrl
            setImagePreview(blobUrl)
          } catch (imgErr) {
            console.warn('[세션 복원] 입력 이미지 fetch 실패', imgErr)
            // 이미지 없어도 다음 단계 진행 가능 — 그냥 skip
          }
        }
      } catch (err) {
        if (cancelled) return
        console.error('[GET /cakes/sessions/{id}] 실패', err)
        setError(extractErrorMessage(err, '세션을 불러오지 못했어요.'))
      } finally {
        if (!cancelled) setRestoring(false)
      }
    })()
    return () => {
      cancelled = true
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl)
    }
  }, [incomingSessionId])

  // 선택된 카테고리에 맞는 시뮬레이션만 필터링
  const availableSimulations = useMemo(
    () => simulationsForCategory(focusCategory),
    [focusCategory],
  )

  /**
   * 분석 결과의 base / creams / toppings / coating 을 펼쳐서
   * 한 줄의 키워드 칩 목록으로 변환. 빈 배열·'none' 은 제외.
   */
  const focusKeywords = useMemo<
    Array<{ keyword: string; category: FocusCategory }>
  >(() => {
    if (!analysis) return []
    const items: Array<{ keyword: string; category: FocusCategory }> = []
    analysis.base?.forEach((k) => items.push({ keyword: k, category: 'base' }))
    analysis.creams?.forEach((k) =>
      items.push({ keyword: k, category: 'creams' }),
    )
    analysis.toppings?.forEach((k) =>
      items.push({ keyword: k, category: 'toppings' }),
    )
    if (analysis.coating && analysis.coating !== 'none') {
      items.push({ keyword: analysis.coating, category: 'coating' })
    }
    return items
  }, [analysis])

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
    setAnalysis(null)
    setFocusKey(null)
    setFocusCategory(null)
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
      setAnalysis(res.analysis ?? null)
    } catch (err) {
      console.error('[POST /cakes/analyze] error:', err)
      setError(extractErrorMessage(err, '이미지 분석에 실패했습니다.'))
    } finally {
      setAnalyzing(false)
    }
  }

  const persistSelections = async ({
    nextSimulationCode = simulationCode,
    nextBackgroundCode = backgroundCode,
    nextFocusKey = focusKey,
    nextPrompt = prompt,
  }: {
    nextSimulationCode?: string | null
    nextBackgroundCode?: string | null
    nextFocusKey?: string | null
    nextPrompt?: string
  } = {}) => {
    if (!sessionId) return
    try {
      await updateSessionSelections(sessionId, {
        simulationCode: normalizeSimulationCode(nextSimulationCode),
        backgroundCode:
          nextBackgroundCode === 'none' ? null : nextBackgroundCode,
        focus: nextFocusKey,
        hint: nextPrompt,
      })
    } catch (err) {
      console.warn('[PATCH /selections] 저장 실패', err)
    }
  }

  const handleFocusSelect = (keyword: string, category: FocusCategory) => {
    const allowed = simulationsForCategory(category).map((s) => s.key)
    const nextSimulationCode =
      simulationCode && allowed.includes(simulationCode) ? simulationCode : null

    setFocusKey(keyword)
    setFocusCategory(category)
    setSimulationCode(nextSimulationCode)
    void persistSelections({
      nextFocusKey: keyword,
      nextSimulationCode,
    })
  }

  const handleSimulationSelect = (code: string) => {
    setSimulationCode(code)
    void persistSelections({ nextSimulationCode: code })
  }

  const handleBackgroundSelect = (code: string) => {
    setBackgroundCode(code)
    void persistSelections({ nextBackgroundCode: code })
  }

  const handleHintBlur = () => {
    void persistSelections()
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
      const simToSend = normalizeSimulationCode(simulationCode)
      const res = await generateKeyframe(sessionId, {
        simulationCode: simToSend,
        // '미선택' (UI 키 'none') → API 에는 null 전송
        backgroundCode: backgroundCode === 'none' ? null : backgroundCode,
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
      const simToSend = normalizeSimulationCode(simulationCode)
      const res = await generatePreviewPrompt(sessionId, {
        simulationCode: simToSend,
        backgroundCode: backgroundCode === 'none' ? null : backgroundCode,
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

  const handlePromptBlur = async () => {
    if (!sessionId || !autoPrompt.trim()) return
    try {
      await updateVideoPrompt(sessionId, autoPrompt, prompt)
    } catch (err) {
      console.warn('[PATCH /video-prompt] 저장 실패', err)
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

  // 세션 복원 로딩 — full-page spinner
  if (restoring) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-12 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm">진행 중인 세션을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-6">
      <header>
        <p className="text-sm font-medium text-brand-500">Create</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
          영상 만들기
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          메뉴 사진과 옵션을 골라 AI 가 자동으로 만들어드려요.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
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
          className="relative flex h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed border-gray-200 bg-linear-to-br from-gray-50 to-orange-50/40 text-gray-500 transition hover:border-brand-300 hover:from-brand-50 hover:to-orange-50/60 disabled:cursor-not-allowed disabled:opacity-70"
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

      {/* 강조 키워드 선택 — analyze 결과에서 동적으로 칩 렌더링 */}
      {sessionId && (
        <Section title="강조할 키워드 (1개 선택)">
          {focusKeywords.length === 0 ? (
            <p className="text-xs text-gray-400">
              분석 결과에서 강조할 만한 키워드를 찾지 못했어요. 다른 사진으로
              시도해보세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {focusKeywords.map((item) => {
                const active = focusKey === item.keyword
                return (
                  <button
                    key={`${item.category}:${item.keyword}`}
                    type="button"
                    onClick={() =>
                      handleFocusSelect(item.keyword, item.category)
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'border-brand-500 bg-brand-50 text-brand-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {keywordLabel(item.keyword)}
                  </button>
                )
              })}
            </div>
          )}
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
                  onClick={() => handleSimulationSelect(sim.key)}
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
              const hasImage = !!bg.image
              return (
                <button
                  key={bg.key}
                  type="button"
                  onClick={() => handleBackgroundSelect(bg.key)}
                  className={`relative flex aspect-2/1 items-center justify-center overflow-hidden rounded-2xl p-3 transition ${
                    hasImage
                      ? 'bg-gray-200 text-white'
                      : 'border border-dashed border-gray-300 bg-gray-50 text-gray-500'
                  } ${isActive ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}
                  style={{
                    backgroundImage: bg.image ? `url(${bg.image})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {hasImage && <span className="absolute inset-0 bg-black/35" />}
                  <span
                    className={`relative text-base font-semibold ${
                      hasImage ? 'drop-shadow-md' : ''
                    }`}
                  >
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
          onBlur={handleHintBlur}
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
              onBlur={handlePromptBlur}
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
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
        <span className="h-1 w-4 rounded-full bg-brand-500" />
        {title}
      </h2>
      {children}
    </section>
  )
}
