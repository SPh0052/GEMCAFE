import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import MobileShell from '@/shared/components/MobileShell'
import AppHeader from '@/layout/AppHeader'
import BottomNav from '@/layout/BottomNav'
import { extractErrorMessage } from '@/shared/lib/errors'
import { getVideoStatus } from './api'

interface CreatingLocationState {
  videoId?: number
}

const POLL_INTERVAL_MS = 3000
const COMPLETED_VALUES = new Set(['COMPLETED', 'SUCCESS', 'DONE'])
const FAILED_VALUES = new Set(['FAILED', 'ERROR'])

export default function CreatingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const videoId = (location.state as CreatingLocationState | null)?.videoId

  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!videoId) {
      setError(
        '잘못된 접근입니다. 영상 만들기 페이지에서 다시 시도해주세요.',
      )
      return
    }

    cancelledRef.current = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      if (cancelledRef.current) return
      try {
        const res = await getVideoStatus(videoId)
        console.log('[GET /videos/{id}/status] response:', res)
        if (cancelledRef.current) return

        const status = (res.status ?? '').toUpperCase()
        if (COMPLETED_VALUES.has(status)) {
          navigate(`/videos/${videoId}`, { replace: true })
          return
        }
        if (FAILED_VALUES.has(status)) {
          setError('영상 생성에 실패했습니다. 다시 시도해주세요.')
          return
        }
        // 진행 중 — 다음 폴 예약
        timer = setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        console.error('[GET /videos/{id}/status] error:', err)
        if (cancelledRef.current) return
        setError(
          extractErrorMessage(err, '진행 상태를 확인하지 못했습니다.'),
        )
      }
    }

    poll()

    return () => {
      cancelledRef.current = true
      if (timer) clearTimeout(timer)
    }
  }, [videoId, navigate])

  return (
    <MobileShell>
      <AppHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        {error ? (
          <>
            <div className="flex h-44 w-44 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <span className="text-5xl">!</span>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold">영상 생성에 문제가 생겼어요</h1>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/create', { replace: true })}
              className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              영상 만들기로 돌아가기
            </button>
          </>
        ) : (
          <>
            <div className="relative flex h-44 w-44 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-brand-50" />
              <Loader2 className="relative h-20 w-20 animate-spin text-brand-500" />
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold">영상 만드는 중...</h1>
              <p className="mt-1 text-sm text-gray-500">
                1~3분 정도 걸려요. 잠시만 기다려 주세요.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs leading-relaxed text-gray-600">
                창을 닫아도 영상은 계속 생성돼요. 완료되면 "내 영상" 페이지에서
                확인할 수 있어요.
              </p>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </MobileShell>
  )
}
