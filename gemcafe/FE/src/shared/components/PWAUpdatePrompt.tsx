import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

/**
 * 새 SW 버전이 받아진 시점에 사용자에게 새로고침 토스트 노출.
 * 클릭하면 새 SW 를 즉시 활성화 + 페이지 리로드.
 *
 * registerType: 'autoUpdate' 가 백그라운드로 SW 받아두면 needRefresh = true 가 됨.
 */
export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(reg) {
      if (reg) console.log('[PWA] SW registered', reg.scope)
    },
    onRegisterError(err) {
      console.error('[PWA] SW register error', err)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-gray-900/95 px-4 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-md">
        <span>새 버전이 준비됐어요</span>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold transition hover:bg-brand-600"
        >
          <RefreshCw className="h-3 w-3" />
          새로고침
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="닫기"
          className="text-xs text-white/60 transition hover:text-white"
        >
          나중에
        </button>
      </div>
    </div>
  )
}
