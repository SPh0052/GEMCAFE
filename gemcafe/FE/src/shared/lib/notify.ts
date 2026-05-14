/**
 * PWA 푸시 알림 헬퍼.
 *
 * Service Worker 가 활성화돼있으면 ServiceWorkerRegistration.showNotification 으로,
 * 없으면 plain Notification 으로 fallback. SW 경로는 백그라운드 탭에서도 동작.
 *
 * 권한 요청은 반드시 사용자 액션 (클릭 등) 핸들러 안에서 호출해야 함.
 * 브라우저가 임의 시점 호출은 자동 차단.
 */

let permissionPromptedThisSession = false

/**
 * 알림 권한 요청 — 첫 호출 시에만 prompt 띄우고, 이후엔 현재 상태 반환.
 * 사용자가 'denied' 한 경우엔 재요청 안 함 (스팸 방지).
 */
export async function requestNotificationPermissionOnce(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied'
  if (!('Notification' in window)) return 'denied'

  const current = Notification.permission
  if (current === 'granted' || current === 'denied') return current
  if (permissionPromptedThisSession) return current

  permissionPromptedThisSession = true
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

interface NotifyOptions {
  title: string
  body?: string
  /** 같은 tag 의 알림은 묶임 (중복 방지). 예: 'watermark-123' */
  tag?: string
  icon?: string
  /** 알림 클릭 시 사용할 데이터 (커스텀 SW 가 라우팅에 사용 가능) */
  data?: Record<string, unknown>
  /** 클릭 시 열릴 URL (커스텀 SW 가 있으면 클릭 시 이 URL 로 이동) */
  url?: string
}

/**
 * 알림 표시. 권한 없으면 silent 무시.
 * SW 등록돼있으면 SW 경로 (백그라운드 탭에서도 동작), 아니면 plain Notification.
 */
export async function showAppNotification(opts: NotifyOptions): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const icon = opts.icon ?? `${import.meta.env.BASE_URL}logo.png`
  const init: NotificationOptions = {
    body: opts.body,
    icon,
    badge: icon,
    tag: opts.tag,
    data: { ...(opts.data ?? {}), url: opts.url },
  }

  try {
    // ServiceWorker 가 활성화돼있으면 그쪽으로 — 탭이 백그라운드여도 동작
    if (
      'serviceWorker' in navigator &&
      navigator.serviceWorker.controller
    ) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(opts.title, init)
      return
    }
  } catch (err) {
    console.warn('[notify] SW showNotification 실패 — Notification fallback', err)
  }

  // SW 없거나 실패 시 plain Notification (현재 탭이 활성/포커스 상태에서만 표시)
  try {
    new Notification(opts.title, init)
  } catch (err) {
    console.warn('[notify] Notification 생성 실패', err)
  }
}
