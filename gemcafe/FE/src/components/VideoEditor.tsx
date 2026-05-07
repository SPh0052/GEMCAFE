import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Home,
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  Trash2,
  Type,
  Upload,
  UploadCloud,
} from 'lucide-react'
import BottomNav from '@/layout/BottomNav'

// 디자인 기준 캔버스 크기 — 텍스트 위치/사이즈는 모두 이 기준으로 정규화.
// 표시 시: displayHeight 비율로 스케일. 녹화 시: composeHeight 비율로 스케일.
const DESIGN_HEIGHT = 960

const FONTS = [
  { label: '나눔고딕', family: 'Nanum Gothic' },
  { label: '나눔명조', family: 'Nanum Myeongjo' },
  { label: '고운돋움', family: 'Gowun Dodum' },
  { label: '제주명조', family: 'Jeju Myeongjo' },
  { label: '블랙한산스', family: 'Black Han Sans' },
]

// 자주 쓰일 5개 사이즈 프리셋 (DESIGN_HEIGHT 960 기준 px)
const FONT_SIZE_PRESETS = [
  { label: '작게', value: 32 },
  { label: '보통', value: 48 },
  { label: '크게', value: 64 },
  { label: '더 크게', value: 84 },
  { label: '최대', value: 110 },
]

// 컬러 팔레트 — 흰/검 + 적당히 선명하지만 쨍하지 않은 8색.
// (Tailwind 400 대 톤 위주 → 둔하지 않으면서도 비비드하지 않음)
const COLOR_PALETTE = [
  '#FFFFFF', // 화이트
  '#1F2937', // 차콜 (gray-800)
  '#F87171', // 살구빨강 (red-400)
  '#FB923C', // 머스크오렌지 (orange-400)
  '#FBBF24', // 머스타드 (amber-400)
  '#A3E635', // 라임 (lime-400)
  '#34D399', // 민트 (emerald-400)
  '#60A5FA', // 스카이 (blue-400)
  '#A78BFA', // 라벤더 (violet-400)
  '#F472B6', // 핑크 (pink-400)
]

// 카페 홍보 숏츠에 어울리는 BGM — 밝고 편안하고 쾌활한 톤.
const BGM_LIST = [
  {
    title: '맑은 아침의 카페',
    url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
  },
  {
    title: '햇살 우쿨렐레',
    url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_b6e8a44f97.mp3',
  },
  {
    title: '아늑한 라운지',
    url: 'https://cdn.pixabay.com/audio/2023/03/09/audio_c6ccf25a68.mp3',
  },
  {
    title: '라떼 한 잔의 여유',
    url: 'https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3',
  },
]

interface TextItem {
  id: string
  text: string
  /** 가로 위치 — 캔버스 너비 대비 비율 (0~1, 0.5 = 가운데) */
  x: number
  /** 세로 위치 — 캔버스 높이 대비 비율 */
  y: number
  /** 폰트 사이즈 — DESIGN_HEIGHT(960) 기준 px. 표시/녹화 시 자동 스케일. */
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
  outline: boolean
}

const newId = () => Math.random().toString(36).slice(2, 9)
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

export default function VideoEditor() {
  // refs
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const composeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const composeRafRef = useRef<number | null>(null)

  // audio refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const videoSourceConnectedRef = useRef<boolean>(false)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)
  const bgmSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const bgmGainRef = useRef<GainNode | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // recorder refs
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // state
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [fontFamily, setFontFamily] = useState(FONTS[0].family)
  const [fontSize, setFontSize] = useState(48)
  const [textColor, setTextColor] = useState('#ffffff')
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [outline, setOutline] = useState(false)
  const [bgmUrl, setBgmUrl] = useState<string | null>(null)
  const [bgmVolume, setBgmVolume] = useState(0.5)
  const [previewBgmUrl, setPreviewBgmUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [activeTab, setActiveTab] = useState<'text' | 'bgm' | null>(null)
  const [progress, setProgress] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  // 텍스트 오버레이 — React state 로 관리 (fabric 미사용)
  const [texts, setTexts] = useState<TextItem[]>([])
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  // 컨테이너 dim 추적 — DraggableText 가 표시 사이즈 계산할 때 사용
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // 녹화 중 텍스트 그리려면 최신 texts 가 필요 → ref 동기화
  const textsRef = useRef<TextItem[]>([])
  useEffect(() => {
    textsRef.current = texts
  }, [texts])

  // isRecording 도 ref 로 동기화 — onTimeUpdate 핸들러에서 stale closure 회피
  const isRecordingRef = useRef(false)
  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // 컨테이너 크기 추적
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setContainerSize({ width: r.width, height: r.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  // 영상 업로드
  const handleUpload = (file: File) => {
    setVideoUrl(URL.createObjectURL(file))
    setVideoLoaded(false)
    setLoadError(null)
  }

  // videoUrl 변경 시 — JSX 의 <video> 엘리먼트(videoRef) 에 listener 부착
  useEffect(() => {
    if (!videoUrl) return
    const v = videoRef.current
    if (!v) return

    setVideoLoaded(false)
    setLoadError(null)
    videoSourceConnectedRef.current = false

    const onMeta = async () => {
      try {
        await v.play()
        v.pause()
        v.currentTime = 0
      } catch {
        try {
          v.currentTime = 0.05
        } catch {
          /* noop */
        }
      }
      setVideoLoaded(true)
    }

    const onError = () => {
      console.error('[VideoEditor] 영상 로드 실패', v.error)
      const code = v.error?.code
      if (code === 4) {
        setLoadError(
          '브라우저가 지원하지 않는 영상 코덱입니다. H.264(MP4) 또는 VP9(WebM) 영상으로 변환해 다시 시도해주세요.',
        )
      } else if (code === 3) {
        setLoadError('영상 디코드에 실패했습니다. 다른 영상으로 시도해주세요.')
      } else {
        setLoadError('영상을 불러올 수 없습니다. 다른 영상으로 시도해주세요.')
      }
    }

    const onEnded = () => {
      setIsPlaying(false)
      bgmAudioRef.current?.pause()
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
    }

    const onTimeUpdate = () => {
      if (isRecordingRef.current && v.duration) {
        setProgress(Math.min(100, (v.currentTime / v.duration) * 100))
      }
    }

    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('error', onError)
    v.addEventListener('ended', onEnded)
    v.addEventListener('timeupdate', onTimeUpdate)

    if (v.readyState >= 1 && v.videoWidth > 0) {
      onMeta()
    }

    return () => {
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('error', onError)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [videoUrl])

  // unmount cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  // 재생/일시정지
  const togglePlay = async () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.muted = false
      try {
        await v.play()
        setIsPlaying(true)
        if (bgmAudioRef.current) {
          await bgmAudioRef.current.play().catch(() => {})
        }
      } catch (err) {
        console.error('재생 실패', err)
      }
    } else {
      v.pause()
      setIsPlaying(false)
      bgmAudioRef.current?.pause()
    }
  }

  // 텍스트 추가
  const addText = () => {
    const id = newId()
    const item: TextItem = {
      id,
      text: textInput || '텍스트를 입력하세요',
      x: 0.5,
      y: 0.5,
      fontSize,
      fontFamily,
      color: textColor,
      bold,
      italic,
      outline,
    }
    setTexts((prev) => [...prev, item])
    setSelectedTextId(id)
    setTextInput('')
  }

  // 텍스트 일부 속성 업데이트
  const updateText = (id: string, patch: Partial<TextItem>) => {
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  // 텍스트 삭제
  const deleteText = (id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id))
    if (selectedTextId === id) setSelectedTextId(null)
  }

  // 선택된 텍스트의 속성을 패널 컨트롤과 연동
  useEffect(() => {
    if (!selectedTextId) return
    setTexts((prev) =>
      prev.map((t) =>
        t.id === selectedTextId
          ? {
              ...t,
              fontFamily,
              fontSize,
              color: textColor,
              bold,
              italic,
              outline,
            }
          : t,
      ),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontFamily, fontSize, textColor, bold, italic, outline])

  // 텍스트 선택 시 패널 컨트롤도 그 값으로 동기화
  useEffect(() => {
    if (!selectedTextId) return
    const t = texts.find((x) => x.id === selectedTextId)
    if (t) {
      setFontFamily(t.fontFamily)
      setFontSize(t.fontSize)
      setTextColor(t.color)
      setBold(t.bold)
      setItalic(t.italic)
      setOutline(t.outline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTextId])

  // 빈 영역(영상/배경) 클릭 → 선택 해제 + 재생 토글
  const onContainerPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-text-overlay]')) return
    if (target.closest('[data-overlay-btn]')) return
    setSelectedTextId(null)
    togglePlay()
  }

  // BGM ────────────────────────────────────────────────────────────
  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
      audioDestRef.current =
        audioCtxRef.current.createMediaStreamDestination()
    }
  }

  const stopPreviewBgm = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    setPreviewBgmUrl(null)
  }

  const togglePreviewBgm = (url: string) => {
    if (previewBgmUrl === url) {
      stopPreviewBgm()
      return
    }
    stopPreviewBgm()
    const audio = new Audio(url)
    audio.crossOrigin = 'anonymous'
    audio.volume = 0.6
    audio.play().catch(() => {})
    audio.onended = () => setPreviewBgmUrl(null)
    previewAudioRef.current = audio
    setPreviewBgmUrl(url)
  }

  const selectBgm = (url: string) => {
    ensureAudio()
    const ctx = audioCtxRef.current!
    stopPreviewBgm()

    if (bgmAudioRef.current) bgmAudioRef.current.pause()
    if (bgmSourceRef.current) bgmSourceRef.current.disconnect()
    if (bgmGainRef.current) bgmGainRef.current.disconnect()

    const audio = new Audio(url)
    audio.crossOrigin = 'anonymous'
    audio.loop = true
    audio.preload = 'auto'

    const source = ctx.createMediaElementSource(audio)
    const gain = ctx.createGain()
    gain.gain.value = bgmVolume

    source.connect(gain)
    gain.connect(ctx.destination)
    if (audioDestRef.current) gain.connect(audioDestRef.current)

    bgmAudioRef.current = audio
    bgmSourceRef.current = source
    bgmGainRef.current = gain
    setBgmUrl(url)

    if (isPlaying) audio.play().catch(() => {})
  }

  useEffect(() => {
    if (bgmGainRef.current) bgmGainRef.current.gain.value = bgmVolume
  }, [bgmVolume])

  // 녹화 ───────────────────────────────────────────────────────────
  const startRecording = async () => {
    const v = videoRef.current
    const compose = composeCanvasRef.current
    if (!v || !compose || !videoLoaded || isRecording) return

    v.muted = false

    ensureAudio()
    const ctx = audioCtxRef.current!
    if (ctx.state === 'suspended') await ctx.resume()

    if (!videoSourceConnectedRef.current) {
      try {
        const src = ctx.createMediaElementSource(v)
        src.connect(ctx.destination)
        if (audioDestRef.current) src.connect(audioDestRef.current)
        videoSourceConnectedRef.current = true
      } catch (err) {
        console.warn('video → audioCtx 연결 스킵', err)
      }
    }

    compose.width = v.videoWidth || 1080
    compose.height = v.videoHeight || 1920
    const composeCtx = compose.getContext('2d')
    if (!composeCtx) {
      console.error('compose 2d context 생성 실패')
      return
    }

    const composeTick = () => {
      composeCtx.clearRect(0, 0, compose.width, compose.height)
      if (v.readyState >= 2) {
        composeCtx.drawImage(v, 0, 0, compose.width, compose.height)
      }
      // 텍스트 오버레이 합성 — 디자인 기준(960) 으로 정규화돼 있어 compose 높이 기준 스케일.
      const scale = compose.height / DESIGN_HEIGHT
      composeCtx.textAlign = 'center'
      composeCtx.textBaseline = 'middle'
      for (const t of textsRef.current) {
        const fs = t.fontSize * scale
        const weight = t.bold ? '700' : '400'
        const style = t.italic ? 'italic' : 'normal'
        composeCtx.font = `${style} ${weight} ${fs}px "${t.fontFamily}", sans-serif`
        const x = t.x * compose.width
        const y = t.y * compose.height
        // 외곽선 옵션이 켜진 경우만 검은 stroke 추가
        if (t.outline) {
          composeCtx.lineWidth = Math.max(2, fs * 0.08)
          composeCtx.strokeStyle = '#000000'
          composeCtx.lineJoin = 'round'
          composeCtx.strokeText(t.text, x, y)
        }
        composeCtx.fillStyle = t.color
        composeCtx.fillText(t.text, x, y)
      }
      composeRafRef.current = requestAnimationFrame(composeTick)
    }
    composeTick()

    chunksRef.current = []

    const videoStream = compose.captureStream(30)
    const audioStream = audioDestRef.current?.stream
    const combined = new MediaStream()
    videoStream.getVideoTracks().forEach((t) => combined.addTrack(t))
    audioStream?.getAudioTracks().forEach((t) => combined.addTrack(t))

    // MP4 우선 시도 → 미지원 브라우저는 webm 으로 fallback.
    // (Chromium 기반 최신 브라우저는 MP4 H.264+AAC 녹화 지원, Firefox 는 webm 만)
    const mimeCandidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    const mimeType =
      mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
    const isMp4 = mimeType.includes('mp4')
    const ext = isMp4 ? 'mp4' : 'webm'
    console.log('[VideoEditor] 녹화 mimeType:', mimeType || '(default)')

    const recorder = new MediaRecorder(
      combined,
      mimeType ? { mimeType } : undefined,
    )
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      if (composeRafRef.current) {
        cancelAnimationFrame(composeRafRef.current)
        composeRafRef.current = null
      }

      const blob = new Blob(chunksRef.current, {
        type: mimeType || 'video/webm',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gem-cafe-edit-${Date.now()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setIsRecording(false)
      setProgress(0)
      v.pause()
      bgmAudioRef.current?.pause()
      setIsPlaying(false)
      recorderRef.current = null
    }

    v.currentTime = 0
    if (bgmAudioRef.current) bgmAudioRef.current.currentTime = 0

    recorder.start(250)
    setIsRecording(true)
    setProgress(0)

    await v.play()
    setIsPlaying(true)
    if (bgmAudioRef.current) {
      await bgmAudioRef.current.play().catch(() => {})
    }
  }

  const stopRecording = () => {
    const r = recorderRef.current
    if (r && r.state === 'recording') r.stop()
    videoRef.current?.pause()
    bgmAudioRef.current?.pause()
  }

  const editorTabs = [
    { key: 'text' as const, label: '텍스트', Icon: Type },
    { key: 'bgm' as const, label: '음악', Icon: Music },
  ]

  return (
    <div className="flex h-screen flex-col bg-gray-900 pb-[calc(5rem+env(safe-area-inset-bottom,0))] md:pb-0">
      {/* 상단 바 */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3 md:px-6">
        <Link
          to="/"
          aria-label="홈으로"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
        >
          <Home className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-white">젬젬 에디터</h1>
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!videoLoaded}
          aria-label={isRecording ? '녹화 중지 및 저장' : '저장'}
          className="flex h-10 w-10 items-center justify-center rounded-full text-brand-400 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRecording ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="h-5 w-5" />
          )}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* 숨김 파일 인풋 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleUpload(f)
            e.target.value = ''
          }}
        />

        {/* 캔버스 영역 */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-gray-900 p-3">
          <div
            ref={containerRef}
            onPointerDown={onContainerPointerDown}
            className="relative h-full max-h-full overflow-hidden rounded-2xl shadow-lg"
            style={{ aspectRatio: '9 / 16', touchAction: 'none' }}
          >
            {/* 영상 */}
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                className="absolute inset-0 h-full w-full bg-black object-contain"
                playsInline
                muted
                preload="auto"
              />
            )}

            {/* 빈 상태 */}
            {!videoUrl && (
              <button
                type="button"
                data-overlay-btn
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f && f.type.startsWith('video/')) handleUpload(f)
                }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800 p-6 text-center transition hover:border-brand-400 hover:bg-gray-700/60"
              >
                <Upload className="h-10 w-10 text-gray-500" />
                <p className="mt-3 text-sm font-semibold text-gray-200">
                  영상을 업로드해주세요
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  클릭하거나 영상 파일을 드래그하세요
                </p>
                {loadError && (
                  <p className="mt-3 max-w-56 rounded-lg bg-rose-900/40 px-3 py-2 text-[11px] leading-snug text-rose-300">
                    {loadError}
                  </p>
                )}
              </button>
            )}

            {/* 텍스트 오버레이 */}
            {videoLoaded &&
              texts.map((t) => (
                <DraggableText
                  key={t.id}
                  item={t}
                  containerSize={containerSize}
                  selected={selectedTextId === t.id}
                  onSelect={() => setSelectedTextId(t.id)}
                  onChange={(patch) => updateText(t.id, patch)}
                  onDelete={() => deleteText(t.id)}
                />
              ))}

            {/* 우상단 재생/일시정지 버튼 */}
            {videoLoaded && !isRecording && (
              <button
                type="button"
                data-overlay-btn
                onClick={togglePlay}
                aria-label={isPlaying ? '일시정지' : '재생'}
                className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow-lg transition hover:bg-black/75"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4 fill-white" />
                )}
              </button>
            )}

            {/* 녹화 진행 바 */}
            {isRecording && (
              <div className="absolute left-3 right-3 top-3 z-30 rounded-lg bg-black/70 px-3 py-2 text-white">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                    녹화 중
                  </span>
                  <span className="font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full bg-brand-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 활성 탭 패널 — 화면의 약 1/3 만 차지하도록 고정 */}
        {activeTab && (
          <div className="h-[33vh] shrink-0 overflow-y-auto border-t border-gray-800 bg-gray-900 text-gray-100">
            <div className="p-4 md:p-5">
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="추가할 문구를 입력하세요"
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />

                  <div>
                    <label className="text-xs font-medium text-gray-400">
                      폰트
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {FONTS.map((f) => (
                        <button
                          key={f.family}
                          type="button"
                          onClick={() => setFontFamily(f.family)}
                          style={{ fontFamily: f.family }}
                          className={`rounded-lg border px-3 py-2 text-xs transition ${
                            fontFamily === f.family
                              ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                              : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400">
                      크기
                    </label>
                    <div className="mt-2 grid grid-cols-5 gap-1.5">
                      {FONT_SIZE_PRESETS.map((p) => {
                        const active = fontSize === p.value
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setFontSize(p.value)}
                            className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                              active
                                ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                                : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {p.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400">
                      색상
                    </label>
                    <div className="mt-2 grid grid-cols-10 gap-1.5">
                      {COLOR_PALETTE.map((c) => {
                        const active = textColor.toLowerCase() === c.toLowerCase()
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTextColor(c)}
                            aria-label={`색상 ${c}`}
                            className={`aspect-square rounded-full border-2 transition ${
                              active
                                ? 'border-brand-400 ring-2 ring-brand-400/30'
                                : 'border-gray-600 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-400">
                      스타일
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBold((b) => !b)}
                        aria-pressed={bold}
                        className={`rounded-lg border px-2 py-2 text-sm font-bold transition ${
                          bold
                            ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => setItalic((b) => !b)}
                        aria-pressed={italic}
                        className={`rounded-lg border px-2 py-2 text-sm italic transition ${
                          italic
                            ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutline((b) => !b)}
                        aria-pressed={outline}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                          outline
                            ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        외곽선
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addText}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
                    >
                      <Plus className="h-4 w-4" />
                      텍스트 추가
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTextId && deleteText(selectedTextId)
                      }
                      disabled={!selectedTextId}
                      aria-label="선택 삭제"
                      className="inline-flex items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'bgm' && (
                <div className="space-y-2">
                  {BGM_LIST.map((bgm) => {
                    const isSelected = bgmUrl === bgm.url
                    const isPreviewing = previewBgmUrl === bgm.url
                    return (
                      <div
                        key={bgm.url}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/15'
                            : 'border-gray-700 bg-gray-800'
                        }`}
                      >
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            isSelected
                              ? 'font-bold text-brand-300'
                              : 'text-gray-200'
                          }`}
                        >
                          {bgm.title}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePreviewBgm(bgm.url)}
                            aria-label="미리듣기"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-300 transition hover:bg-gray-700"
                          >
                            {isPreviewing ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => selectBgm(bgm.url)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                              isSelected
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                            }`}
                          >
                            {isSelected ? '선택됨' : '선택'}
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {bgmUrl && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-400">
                          볼륨
                        </label>
                        <span className="text-xs font-bold text-gray-200">
                          {Math.round(bgmVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={bgmVolume}
                        onChange={(e) => setBgmVolume(Number(e.target.value))}
                        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-700 accent-brand-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 에디터 탭바 */}
        <nav className="flex shrink-0 items-stretch border-t border-gray-800 bg-gray-900">
          {editorTabs.map(({ key, label, Icon }) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(isActive ? null : key)}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition ${
                  isActive
                    ? 'text-brand-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </button>
            )
          })}
        </nav>
      </div>

      <BottomNav />

      {/* 녹화용 hidden compose canvas */}
      <canvas ref={composeCanvasRef} className="hidden" />
    </div>
  )
}

// ─── DraggableText 서브컴포넌트 ──────────────────────────────────
interface DraggableTextProps {
  item: TextItem
  containerSize: { width: number; height: number }
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<TextItem>) => void
  onDelete: () => void
}

function DraggableText({
  item,
  containerSize,
  selected,
  onSelect,
  onChange,
  onDelete,
}: DraggableTextProps) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    active: boolean
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)
  const resizeRef = useRef<{
    active: boolean
    pointerId: number
    cx: number
    cy: number
    initialDist: number
    initialFontSize: number
  } | null>(null)

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    onSelect()
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
    }
    try {
      elRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || !d.active || d.pointerId !== e.pointerId) return
    if (containerSize.width === 0 || containerSize.height === 0) return
    const dx = (e.clientX - d.startX) / containerSize.width
    const dy = (e.clientY - d.startY) / containerSize.height
    onChange({
      x: clamp(d.origX + dx, 0, 1),
      y: clamp(d.origY + dy, 0, 1),
    })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    d.active = false
    try {
      elRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  // ─── 리사이즈 핸들러 (우하단 핸들) ───
  const onResizeDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = elRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const initialDist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1
    resizeRef.current = {
      active: true,
      pointerId: e.pointerId,
      cx,
      cy,
      initialDist,
      initialFontSize: item.fontSize,
    }
    try {
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  const onResizeMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = resizeRef.current
    if (!r || !r.active || r.pointerId !== e.pointerId) return
    const newDist = Math.hypot(e.clientX - r.cx, e.clientY - r.cy)
    const ratio = newDist / r.initialDist
    const newSize = clamp(r.initialFontSize * ratio, 16, 220)
    onChange({ fontSize: newSize })
  }

  const onResizeUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const r = resizeRef.current
    if (!r || r.pointerId !== e.pointerId) return
    r.active = false
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  // 표시 폰트 사이즈 — 컨테이너 높이에 맞춰 스케일
  const scale = containerSize.height
    ? containerSize.height / DESIGN_HEIGHT
    : 1
  const displayFontSize = item.fontSize * scale

  return (
    <div
      ref={elRef}
      data-text-overlay
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'absolute',
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        fontFamily: `"${item.fontFamily}", sans-serif`,
        fontSize: `${displayFontSize}px`,
        fontWeight: item.bold ? 700 : 400,
        fontStyle: item.italic ? 'italic' : 'normal',
        color: item.color,
        WebkitTextStroke: item.outline
          ? `${Math.max(1, displayFontSize * 0.05)}px black`
          : '0',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        cursor: 'grab',
        touchAction: 'none',
        padding: '6px 12px',
        zIndex: selected ? 25 : 20,
        lineHeight: 1.1,
        ...(selected
          ? {
              outline: '2px dashed rgba(255,255,255,0.85)',
              outlineOffset: 2,
              borderRadius: 6,
            }
          : {}),
      }}
    >
      {item.text}
      {selected && (
        <>
          {/* 삭제 X 버튼 (우상단) */}
          <button
            type="button"
            aria-label="텍스트 삭제"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgb(220, 38, 38)',
              color: 'white',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              lineHeight: 1,
              padding: 0,
              zIndex: 1,
            }}
          >
            ×
          </button>
          {/* 리사이즈 핸들 (우하단) — 드래그하면 폰트 사이즈 조절 */}
          <button
            type="button"
            aria-label="크기 조절"
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            onPointerCancel={onResizeUp}
            style={{
              position: 'absolute',
              bottom: -10,
              right: -10,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '2px solid rgb(59, 130, 246)',
              cursor: 'nwse-resize',
              touchAction: 'none',
              padding: 0,
              zIndex: 1,
            }}
          />
        </>
      )}
    </div>
  )
}
