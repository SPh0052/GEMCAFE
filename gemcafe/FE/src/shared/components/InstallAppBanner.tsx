import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

/**
 * PWA 설치 안내 배너.
 *  · Android Chrome: `beforeinstallprompt` 이벤트 받으면 인앱 "설치" 버튼 노출 →
 *    클릭 시 OS 설치 다이얼로그.
 *  · iOS Safari: 자동 prompt 미지원. 사용자가 공유 메뉴 → "홈 화면에 추가" 직접 해야 함 →
 *    설치 안내 텍스트 표시.
 *  · 이미 설치된 standalone 모드 / dismiss 한 경우 / desktop: 미노출.
 *
 * 위치: 페이지 하단 fixed (BottomNav 위쪽). 사용자가 X 누르면 sessionStorage 에 dismiss
 * 기록 — 같은 세션에선 다시 안 보임.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'gemcafe-install-dismissed'

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS: navigator.standalone (비표준), Android/Desktop: display-mode media query
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export default function InstallAppBanner() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // 이미 설치된 (standalone) 상태이거나, 이전 세션에서 dismiss 했으면 노출 X
  useEffect(() => {
    if (isStandalone()) {
      setDismissed(true)
      return
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true)
        return
      }
    } catch {
      /* 시크릿 모드 등에서 storage 비활성 → 그냥 진행 */
    }
    // iOS Safari 는 beforeinstallprompt 이벤트 없음 → 직접 분기
    if (isIos()) {
      setShowIosGuide(true)
    }
  }, [])

  // Android Chrome 등에서 fire 되는 beforeinstallprompt 캐치
  useEffect(() => {
    if (dismissed) return
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  const handleInstall = async () => {
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setPromptEvent(null)
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setPromptEvent(null)
    setShowIosGuide(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  if (dismissed) return null

  // Android / Desktop Chromium: 설치 가능한 이벤트가 fire 된 경우
  if (promptEvent) {
    return (
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[90] w-full max-w-md -translate-x-1/2 px-4 md:bottom-6">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-gray-100 backdrop-blur">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <Download className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">
              앱으로 설치하기
            </p>
            <p className="text-[11px] text-gray-500">
              홈 화면에서 바로 실행할 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
          >
            설치
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="닫기"
            className="text-gray-300 transition hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // iOS: 자동 prompt 없음 → 수동 안내
  if (showIosGuide) {
    return (
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[90] w-full max-w-md -translate-x-1/2 px-4 md:bottom-6">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-gray-100 backdrop-blur">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <Share className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">
              앱으로 설치하기
            </p>
            <p className="text-[11px] leading-snug text-gray-500">
              사파리 공유 버튼 → "홈 화면에 추가"
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="닫기"
            className="text-gray-300 transition hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
