/// <reference lib="webworker" />
/**
 * gemcafe Service Worker — injectManifest 모드.
 *
 * vite-plugin-pwa 가 빌드 시 workbox 의 precache manifest 를 `self.__WB_MANIFEST` 에 주입.
 * 우리가 추가로 처리하는 것:
 *  · 알림 클릭 (notificationclick) → 알림의 data.url 페이지로 포커스/오픈
 *  · skipWaiting / clientsClaim — autoUpdate 시 새 SW 가 즉시 활성화
 */

import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

// Workbox 가 빌드 시 만들어주는 precache manifest 주입
precacheAndRoute(self.__WB_MANIFEST)

// 새 SW 즉시 활성화 — 기존 탭들도 다음 navigate 부터 새 SW 가 제어
self.skipWaiting()
clientsClaim()

/**
 * 알림 클릭 핸들러.
 * showNotification 호출 시 data.url 을 같이 넣어두면, 클릭 시 그 URL 로 이동.
 *  · 이미 열린 탭 중 같은 URL 이 있으면 → focus
 *  · 같은 origin 의 탭이 있으면 → 그 탭으로 URL 변경 + focus
 *  · 둘 다 없으면 → 새 탭 오픈
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as { url?: string } | undefined
  const targetUrl = data?.url
  if (!targetUrl) return

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // 1) 정확히 같은 URL 의 탭 우선 focus
      for (const c of allClients) {
        const u = new URL(c.url)
        if (u.pathname.endsWith(targetUrl) || c.url.includes(targetUrl)) {
          return c.focus()
        }
      }

      // 2) 같은 origin 탭 중 첫번째 → 거기서 URL 변경
      for (const c of allClients) {
        try {
          const u = new URL(c.url)
          if (u.origin === self.location.origin) {
            await c.navigate(targetUrl)
            return c.focus()
          }
        } catch {
          /* ignore invalid url */
        }
      }

      // 3) 새 탭
      return self.clients.openWindow(targetUrl)
    })(),
  )
})
