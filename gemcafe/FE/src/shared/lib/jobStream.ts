import { showAppNotification } from './notify'

const API_BASE = '/dev/be/gemcafe/api/v1'

interface SubscribeOptions {
  jobId: string
  /** 알림 제목 — 작업 완료 시 PWA 알림에 표시 */
  notificationTitle?: string
  notificationBody?: string
  /** 알림 클릭 시 이동할 URL */
  notificationUrl?: string
  /** 진행 메시지 이벤트 (옵션) */
  onProgress?: (data: unknown) => void
  /** 정상 종료 (BE 가 작업 완료 후 close) */
  onComplete?: (lastData: unknown) => void
  /** 비정상 종료 / 네트워크 에러 */
  onError?: (err: Event) => void
  /** 완료 시 자동으로 알림 발송할지 (기본 true) */
  notifyOnComplete?: boolean
}

/**
 * 작업 진행 SSE 구독.
 *   GET /api/v1/jobs/{jobId}/stream  (text/event-stream)
 *
 * BE 가 작업 완료 또는 실패 시 스트림 종료. 그 시점에 PWA 알림 자동 발송.
 * 반환되는 EventSource 로 호출자가 명시적으로 .close() 가능 (e.g., unmount 시).
 *
 * 인증: 쿠키 기반 (axios 와 동일) → withCredentials 필수.
 */
export function subscribeJobStream(opts: SubscribeOptions): EventSource {
  const url = `${API_BASE}/jobs/${opts.jobId}/stream`
  const es = new EventSource(url, { withCredentials: true })
  const notifyOnComplete = opts.notifyOnComplete ?? true

  let lastData: unknown = null

  es.addEventListener('message', (e) => {
    try {
      const data = JSON.parse(e.data)
      lastData = data
      opts.onProgress?.(data)
    } catch {
      opts.onProgress?.(e.data)
    }
  })

  es.addEventListener('error', (err) => {
    // BE 가 정상 종료한 경우 (readyState=CLOSED) → 작업 완료로 간주.
    // 네트워크 에러 케이스에서도 readyState=CONNECTING 일 수 있어 추가 검사.
    if (es.readyState === EventSource.CLOSED) {
      console.log('[jobStream] 정상 종료', opts.jobId)
      opts.onComplete?.(lastData)
      if (notifyOnComplete) {
        showAppNotification({
          title: opts.notificationTitle ?? '작업이 완료됐어요',
          body: opts.notificationBody,
          tag: `job-${opts.jobId}`,
          url: opts.notificationUrl,
        })
      }
    } else {
      console.warn('[jobStream] 에러', opts.jobId, err)
      opts.onError?.(err)
    }
  })

  return es
}
