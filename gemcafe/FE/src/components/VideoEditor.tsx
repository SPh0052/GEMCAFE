import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as fabric from 'fabric'
import {
  ChevronLeft,
  Download,
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'

const CANVAS_WIDTH = 540
const CANVAS_HEIGHT = 960

const FONTS = [
  { label: '나눔고딕', family: 'Nanum Gothic' },
  { label: '나눔명조', family: 'Nanum Myeongjo' },
  { label: '고운돋움', family: 'Gowun Dodum' },
  { label: '제주명조', family: 'Jeju Myeongjo' },
  { label: '블랙한산스', family: 'Black Han Sans' },
]

const BGM_LIST = [
  {
    title: 'Peaceful Morning',
    url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
  },
  {
    title: 'Happy Ukulele',
    url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_b6e8a44f97.mp3',
  },
  {
    title: 'Cinematic Ambient',
    url: 'https://cdn.pixabay.com/audio/2023/03/09/audio_c6ccf25a68.mp3',
  },
  {
    title: 'Soft Piano',
    url: 'https://cdn.pixabay.com/audio/2022/11/22/audio_febc508520.mp3',
  },
]

export default function VideoEditor() {
  // canvas / video refs
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)
  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fabricVideoRef = useRef<fabric.FabricImage | null>(null)
  const rafRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
  const [fabricReady, setFabricReady] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [fontFamily, setFontFamily] = useState(FONTS[0].family)
  const [fontSize, setFontSize] = useState(48)
  const [textColor, setTextColor] = useState('#ffffff')
  const [bgmUrl, setBgmUrl] = useState<string | null>(null)
  const [bgmVolume, setBgmVolume] = useState(0.5)
  const [previewBgmUrl, setPreviewBgmUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [progress, setProgress] = useState(0)

  // 1) 캔버스는 즉시 초기화. 폰트는 비동기로 백그라운드에서 로드.
  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#000',
      preserveObjectStacking: true,
    })
    fabricRef.current = canvas
    setFabricReady(true)

    // 폰트는 index.html 의 <link> 로 이미 로드됨.
    // CSS Font Loading API 로 ready 가 되면 기존 텍스트 재렌더만 트리거
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => canvas.requestRenderAll()).catch(() => {})
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      fabricRef.current?.dispose()
      fabricRef.current = null
    }
  }, [])

  // 1-1) 캔버스 wrapper 리사이즈 → fabric CSS 차원 동기화
  // (텍스트 드래그 좌표가 displayed 사이즈와 맞으려면 fabric이 CSS dims 를 알아야 함)
  useEffect(() => {
    if (!fabricReady) return
    const wrap = canvasWrapRef.current
    const canvas = fabricRef.current
    if (!wrap || !canvas) return

    const sync = () => {
      const rect = wrap.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      canvas.setDimensions(
        { width: `${rect.width}px`, height: `${rect.height}px` },
        { cssOnly: true },
      )
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(wrap)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [fabricReady])

  // 1-2) 두 손가락 핀치 → 활성 텍스트 fontSize 조절
  useEffect(() => {
    if (!fabricReady) return
    const wrap = canvasWrapRef.current
    const canvas = fabricRef.current
    if (!wrap || !canvas) return

    let pinching = false
    let initialDistance = 0
    let initialFontSize = 0
    let target: fabric.IText | null = null

    const dist = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return

      let active = canvas.getActiveObject() as fabric.IText | null
      // 활성 텍스트가 없으면 최상단의 IText 자동 선택
      if (!active || (active as fabric.Object).type !== 'i-text') {
        const texts = canvas
          .getObjects()
          .filter((o) => (o as fabric.Object).type === 'i-text')
        active = (texts[texts.length - 1] as fabric.IText) ?? null
        if (active) {
          canvas.setActiveObject(active)
          canvas.requestRenderAll()
        }
      }
      if (!active) return

      e.preventDefault()
      pinching = true
      target = active
      initialDistance = dist(e.touches[0], e.touches[1])
      initialFontSize = active.fontSize ?? 48
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2 || !target) return
      e.preventDefault()
      const d = dist(e.touches[0], e.touches[1])
      const ratio = d / initialDistance
      const newSize = Math.max(12, Math.min(220, initialFontSize * ratio))
      target.set({ fontSize: newSize })
      canvas.requestRenderAll()
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        if (pinching && target) {
          // 슬라이더 UI 동기화
          setFontSize(Math.round(target.fontSize ?? 48))
        }
        pinching = false
        target = null
      }
    }

    wrap.addEventListener('touchstart', onTouchStart, { passive: false })
    wrap.addEventListener('touchmove', onTouchMove, { passive: false })
    wrap.addEventListener('touchend', onTouchEnd)
    wrap.addEventListener('touchcancel', onTouchEnd)

    return () => {
      wrap.removeEventListener('touchstart', onTouchStart)
      wrap.removeEventListener('touchmove', onTouchMove)
      wrap.removeEventListener('touchend', onTouchEnd)
      wrap.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [fabricReady])

  // 2) 매 프레임 fabric 재렌더 (비디오 프레임 갱신용)
  useEffect(() => {
    const tick = () => {
      fabricRef.current?.requestRenderAll()
      const v = videoRef.current
      if (v && isRecording && v.duration) {
        setProgress(Math.min(100, (v.currentTime / v.duration) * 100))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isRecording])

  // 3) 영상 업로드 핸들러
  const handleUpload = (file: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    setVideoLoaded(false)
  }

  // 4) videoUrl 바뀌면 fabric 에 비디오 추가 + 첫 프레임 표시
  useEffect(() => {
    if (!videoUrl || !fabricReady || !fabricRef.current) return
    const canvas = fabricRef.current

    // 기존 비디오 정리
    if (fabricVideoRef.current) {
      canvas.remove(fabricVideoRef.current)
      fabricVideoRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
    }
    videoSourceConnectedRef.current = false

    const v = document.createElement('video')
    // crossOrigin 은 외부 도메인 영상에만 필요. blob URL 에서는 오히려 로드 실패 유발.
    v.muted = false
    v.playsInline = true
    v.preload = 'auto'
    // iOS/Safari 호환: 비디오를 DOM 에 hidden 으로 붙여놔야 frame 디코드가 안정적
    v.style.position = 'fixed'
    v.style.top = '-9999px'
    v.style.left = '-9999px'
    v.style.width = '1px'
    v.style.height = '1px'
    v.style.opacity = '0'
    v.style.pointerEvents = 'none'
    document.body.appendChild(v)
    v.src = videoUrl
    videoRef.current = v
    v.load()
    console.log('[VideoEditor] 영상 로드 시작', videoUrl)

    let added = false

    const addToCanvas = () => {
      if (added) return
      if (!v.videoWidth || !v.videoHeight) {
        console.log('[VideoEditor] addToCanvas skip — dims 미준비', {
          w: v.videoWidth,
          h: v.videoHeight,
          readyState: v.readyState,
        })
        return
      }
      added = true
      try {
        console.log('[VideoEditor] FabricImage 생성', {
          w: v.videoWidth,
          h: v.videoHeight,
        })
        const fabricImg = new fabric.FabricImage(v, {
          objectCaching: false,
          selectable: false,
          evented: false,
        })
        const scale = Math.min(
          CANVAS_WIDTH / v.videoWidth,
          CANVAS_HEIGHT / v.videoHeight,
        )
        fabricImg.scaleX = scale
        fabricImg.scaleY = scale
        fabricImg.left = (CANVAS_WIDTH - v.videoWidth * scale) / 2
        fabricImg.top = (CANVAS_HEIGHT - v.videoHeight * scale) / 2
        canvas.add(fabricImg)
        canvas.sendObjectToBack(fabricImg)
        fabricVideoRef.current = fabricImg
        setVideoLoaded(true)
        canvas.requestRenderAll()
        console.log('[VideoEditor] 캔버스 추가 완료')
      } catch (err) {
        console.error('[VideoEditor] FabricImage 생성 실패', err)
        added = false
      }
    }

    // loadedmetadata: 사이즈 확보, 첫 프레임 디코드 트리거
    const onMeta = () => {
      console.log('[VideoEditor] loadedmetadata', {
        w: v.videoWidth,
        h: v.videoHeight,
        duration: v.duration,
      })
      if (v.readyState >= 2) addToCanvas()
      try {
        v.currentTime = 0.05
      } catch {
        /* noop */
      }
    }

    // loadeddata / canplay / seeked 어느 쪽이든 들어오면 추가
    const onReady = (e: Event) => {
      console.log('[VideoEditor] ready', e.type, { readyState: v.readyState })
      addToCanvas()
      canvas.requestRenderAll()
    }

    const onError = () => {
      console.error('[VideoEditor] 영상 로드 실패', v.error)
    }

    const onEnded = () => {
      setIsPlaying(false)
      bgmAudioRef.current?.pause()
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
    }

    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('loadeddata', onReady)
    v.addEventListener('canplay', onReady)
    v.addEventListener('seeked', onReady)
    v.addEventListener('ended', onEnded)
    v.addEventListener('error', onError)

    // 안전망: 어떤 이벤트도 안 떨어진 상태에서 일정 시간 뒤에도 readyState 가 충분하면 강제 추가
    const fallback = window.setTimeout(() => {
      if (!added && v.videoWidth && v.videoHeight) {
        addToCanvas()
      }
    }, 1500)

    return () => {
      window.clearTimeout(fallback)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('loadeddata', onReady)
      v.removeEventListener('canplay', onReady)
      v.removeEventListener('seeked', onReady)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('error', onError)
      if (v.parentNode) v.parentNode.removeChild(v)
    }
  }, [videoUrl, fabricReady])

  // 5) 재생/일시정지
  const togglePlay = async () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
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

  // 6) 텍스트 추가
  const addText = () => {
    if (!fabricRef.current) return
    const text = new fabric.IText(textInput || '텍스트를 입력하세요', {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      originX: 'center',
      originY: 'center',
      fontFamily,
      fontSize,
      fill: textColor,
      stroke: '#000',
      strokeWidth: 1,
      paintFirst: 'stroke',
    })
    fabricRef.current.add(text)
    fabricRef.current.setActiveObject(text)
    fabricRef.current.requestRenderAll()
    setTextInput('')
  }

  // 7) 활성 텍스트 속성 동기화
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (active && (active as fabric.IText).type === 'i-text') {
      active.set({ fontFamily, fontSize, fill: textColor })
      canvas.requestRenderAll()
    }
  }, [fontFamily, fontSize, textColor])

  const deleteSelected = () => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.getActiveObjects().forEach((o) => {
      if (o !== fabricVideoRef.current) canvas.remove(o)
    })
    canvas.discardActiveObject()
    canvas.requestRenderAll()
  }

  // 8) BGM
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

  // 9) 저장 (녹화)
  const startRecording = async () => {
    const v = videoRef.current
    const canvasEl = canvasElRef.current
    if (!v || !canvasEl || !videoLoaded || isRecording) return

    ensureAudio()
    const ctx = audioCtxRef.current!
    if (ctx.state === 'suspended') await ctx.resume()

    // 비디오 자체 오디오를 녹화 destination 에 한 번만 연결
    if (!videoSourceConnectedRef.current) {
      try {
        const src = ctx.createMediaElementSource(v)
        src.connect(ctx.destination)
        if (audioDestRef.current) src.connect(audioDestRef.current)
        videoSourceConnectedRef.current = true
      } catch (err) {
        // 같은 element 로 두 번 만들면 throw — 무시 가능
        console.warn('video → audioCtx 연결 스킵', err)
      }
    }

    chunksRef.current = []

    const videoStream = canvasEl.captureStream(30)
    const audioStream = audioDestRef.current?.stream
    const combined = new MediaStream()
    videoStream.getVideoTracks().forEach((t) => combined.addTrack(t))
    audioStream?.getAudioTracks().forEach((t) => combined.addTrack(t))

    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    const mimeType =
      mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''

    const recorder = new MediaRecorder(
      combined,
      mimeType ? { mimeType } : undefined,
    )
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeType || 'video/webm',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gem-cafe-edit-${Date.now()}.webm`
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

  // unmount cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
          돌아가기
        </Link>
        <h1 className="text-base font-bold text-gray-900 md:text-lg">
          영상 편집
        </h1>
        <div className="w-20" /> {/* spacer for symmetry */}
      </header>

      {/* 본문 — 모바일은 column, 데스크톱은 row */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* 캔버스 영역 */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-gray-100 p-4 md:p-8">
          {/* 9:16 컨테이너 — 화면 크기에 맞춰 height 우선, aspect 로 width 결정 */}
          <div
            ref={canvasWrapRef}
            className="relative aspect-9/16 h-[min(65vh,calc((100vw-2rem)*16/9))] max-h-full md:h-[min(calc(100vh-200px),calc((100vw-26rem)*16/9))] lg:h-[min(calc(100vh-200px),calc((100vw-28rem)*16/9))]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
                e.target.value = '' // 같은 파일 재선택 가능하도록
              }}
            />

            {!videoLoaded && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add(
                    'border-brand-400',
                    'bg-brand-50/40',
                  )
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove(
                    'border-brand-400',
                    'bg-brand-50/40',
                  )
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove(
                    'border-brand-400',
                    'bg-brand-50/40',
                  )
                  const f = e.dataTransfer.files?.[0]
                  if (f && f.type.startsWith('video/')) handleUpload(f)
                }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
              >
                <Upload className="h-10 w-10 text-gray-400" />
                <p className="mt-3 text-sm font-semibold text-gray-700">
                  영상을 업로드해주세요
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  클릭하거나 영상 파일을 드래그하세요
                </p>
              </button>
            )}
            <canvas
              ref={canvasElRef}
              className={`h-full w-full rounded-2xl bg-black shadow-lg ${
                videoLoaded ? '' : 'invisible'
              }`}
            />
          </div>

          {/* 재생/녹화 컨트롤 */}
          {videoLoaded && !isRecording && (
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlaying ? '일시정지' : '미리보기 재생'}
            </button>
          )}

          {isRecording && (
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                  녹화 중
                </span>
                <span className="font-bold text-brand-600">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 컨트롤 패널 */}
        <aside className="flex w-full flex-col overflow-y-auto border-t border-gray-200 bg-white md:w-96 md:border-l md:border-t-0 lg:w-105">
          <div className="space-y-6 p-5 md:p-6">
            {videoLoaded && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Upload className="h-3.5 w-3.5" />
                다른 영상으로 변경
              </button>
            )}

            <Section title="텍스트 추가">
              <div className="space-y-3">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="추가할 문구를 입력하세요"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />

                <div>
                  <label className="text-xs font-medium text-gray-500">
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
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500">
                      크기
                    </label>
                    <span className="text-xs font-bold text-gray-700">
                      {fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={16}
                    max={120}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500">
                    색상
                  </label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
                  />
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
                    onClick={deleteSelected}
                    aria-label="선택 삭제"
                    className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Section>

            <Section title="배경음악" icon={<Music className="h-4 w-4" />}>
              <div className="space-y-2">
                {BGM_LIST.map((bgm) => {
                  const isSelected = bgmUrl === bgm.url
                  const isPreviewing = previewBgmUrl === bgm.url
                  return (
                    <div
                      key={bgm.url}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          isSelected
                            ? 'font-bold text-brand-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {bgm.title}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePreviewBgm(bgm.url)}
                          aria-label="미리듣기"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
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
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      <label className="text-xs font-medium text-gray-500">
                        볼륨
                      </label>
                      <span className="text-xs font-bold text-gray-700">
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
                      className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-brand-500"
                    />
                  </div>
                )}
              </div>
            </Section>

            <button
              type="button"
              onClick={startRecording}
              disabled={!videoLoaded || isRecording}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRecording ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  저장 중 {Math.round(progress)}%
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  영상 저장하기
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}
