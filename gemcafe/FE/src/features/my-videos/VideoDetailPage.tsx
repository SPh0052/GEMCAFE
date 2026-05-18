import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Download, Loader2, Pencil, Send, Share2 } from 'lucide-react'
import { AuthedVideo } from '@/shared/components/AuthedMedia'
import { api } from '@/shared/lib/axios'
import {
  requestNotificationPermissionOnce,
  showAppNotification,
} from '@/shared/lib/notify'
import {
  getVideoDetail,
  requestWatermarkDownload,
  type VideoDetail,
} from './api'
import SocialUploadModal from './SocialUploadModal'

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const videoId = id ? Number(id) : NaN

  const [detail, setDetail] = useState<VideoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  /** 워터마크 처리 중 → 풀스크린 로딩 모달 표시용 */
  const [watermarkLoading, setWatermarkLoading] = useState(false)
  /** SNS 업로드 모달 open 여부 */
  const [socialOpen, setSocialOpen] = useState(false)
  /**
   * 공유 모달 상태 — 'preparing' / 'ready' / 'error'.
   * Chrome user-gesture 우회를 위해 모달 안 "공유하기" 버튼이 진짜 share 트리거.
   */
  const [shareModalOpen, setShareModalOpen] = useState(false)
  type ShareStep = 'preparing' | 'ready' | 'error'
  const [shareStep, setShareStep] = useState<ShareStep>('preparing')
  /**
   * 워터마크 File 캐시 — 공유/다운로드 양쪽이 공유.
   * 한 번 생성하면 페이지 머무는 동안 재사용 → 두 번째 액션부터 BE 호출·재다운로드 안 함.
   *
   * 무효화 조건:
   *  · 다른 video 페이지로 이동 (= 컴포넌트 unmount → state 자동 초기화)
   *  · 같은 video 의 detail 가 새로 fetch 됨 (편집 후 돌아온 케이스 등)
   *    → 아래 useEffect([detail?.videoId]) 가 처리
   */
  const [cachedWatermarkFile, setCachedWatermarkFile] = useState<File | null>(
    null,
  )

  // detail 이 새로 로드되거나 다른 videoId 로 바뀌면 캐시 폐기.
  // 편집기에서 편집 후 돌아온 케이스에서 stale 한 워터마크가 재사용되지 않게 보장.
  useEffect(() => {
    setCachedWatermarkFile(null)
  }, [detail?.videoId])

  // 토스트 자동 해제
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  // 영상 상세 조회
  useEffect(() => {
    if (!Number.isFinite(videoId)) {
      setError('잘못된 영상 ID 입니다.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    getVideoDetail(videoId)
      .then((res) => {
        console.log('[GET /videos/{id}] response:', res)
        if (cancelled) return
        setDetail(res)
      })
      .catch((err) => {
        console.error('[GET /videos/{id}] error:', err)
        if (cancelled) return

        // BE 정의 에러 코드 별 UX 분기
        // - 404 VIDEO-001: 영상 없음 / 403 AUTH-004: 남의 영상 — 동일 메시지(정보 노출 방지)
        // - 400 VIDEO-003: 아직 생성 중 — 진행 페이지로 redirect
        // - 401: axios 인터셉터가 refresh 자동 처리
        if (axios.isAxiosError(err)) {
          const status = err.response?.status
          if (status === 404 || status === 403) {
            setError('영상을 찾을 수 없습니다.')
            return
          }
          if (status === 400) {
            // 아직 생성 중 → 진행상태 화면으로
            navigate('/creating', {
              state: { videoId },
              replace: true,
            })
            return
          }
        }
        setError('영상을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [videoId])

  const shareTitle = detail ? `${detail.title} — gem.cafe` : 'gem.cafe'
  const shareText = detail
    ? `${detail.title} 영상을 확인해보세요!`
    : 'gem.cafe 영상'

  /**
   * 인증 보호 경로의 영상을 blob 으로 받아온다.
   * 다운로드·공유에서 공통 사용.
   */
  const fetchVideoBlob = async (url: string): Promise<Blob> => {
    // /dev/files/* 같은 origin-relative 경로는 baseURL 우회
    const useOriginBase = /^\/dev\//.test(url)
    const res = await api.get<Blob>(url, {
      responseType: 'blob',
      ...(useOriginBase ? { baseURL: '' } : {}),
    })
    return res.data
  }

  const handleEdit = () => {
    if (!detail) return
    // 편집기로 영상 정보 전달 — VideoEditor 가 업로드 단계 건너뛰고 바로 편집 가능
    navigate('/editor', {
      state: {
        videoId: detail.videoId,
        title: detail.title,
        originFileName: detail.originFileName,
        videoUrl: detail.videoUrl,
        thumbnailUrl: detail.thumbnailUrl,
      },
    })
  }

  /**
   * 워터마크 File 보장 — 캐시 있으면 즉시 반환, 없으면 fetch + 캐시.
   * 공유와 다운로드가 같은 File 을 공유해서 두 번째 호출부턴 BE 안 침.
   */
  const ensureWatermarkedFile = async (): Promise<File> => {
    if (cachedWatermarkFile) {
      console.log('[Watermark] 캐시 사용 — BE 호출 안 함')
      return cachedWatermarkFile
    }
    if (!detail) throw new Error('영상 정보 없음')
    const meta = await requestWatermarkDownload(detail.videoId)
    console.log('[POST /videos/.../watermark-download] response:', meta)
    const blob = await fetchVideoBlob(meta.downloadUrl)
    const file = new File([blob], meta.fileName, {
      type: blob.type || 'video/mp4',
    })
    setCachedWatermarkFile(file)
    // 처리 끝 — PWA 알림 (권한 있을 때만 표시; 탭이 백그라운드여도 SW 통해 동작)
    showAppNotification({
      title: '영상이 준비됐어요',
      body: `"${detail.originFileName || detail.title}" 워터마크 처리가 끝났어요.`,
      tag: `watermark-${detail.videoId}`,
      url: `/videos/${detail.videoId}`,
    })
    return file
  }

  /**
   * 다운로드: 워터마크 합성 → 로컬 저장. 캐시 있으면 BE 안 거치고 즉시 다운로드.
   */
  const handleDownload = async () => {
    if (!detail || downloading) return
    // 사용자 gesture 컨텍스트에서 권한 prompt — 처음 1회만 실제 모달 뜸
    void requestNotificationPermissionOnce()
    setDownloading(true)
    setDownloadProgress(null)
    // 캐시 있을 땐 로딩 모달 안 띄움 — 즉시 다운로드 시작 느낌
    const showLoading = !cachedWatermarkFile
    if (showLoading) setWatermarkLoading(true)
    try {
      const file = await ensureWatermarkedFile()
      const objUrl = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = file.name || `${detail.originFileName || 'gemcafe'}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)
      setToast('다운로드를 시작했어요.')
    } catch (err) {
      console.error('[VideoDetail] 워터마크 다운로드 실패', err)
      setToast('다운로드에 실패했습니다.')
    } finally {
      if (showLoading) setWatermarkLoading(false)
      setDownloading(false)
    }
  }

  /**
   * 1단계: 공유 버튼 클릭 → 모달 오픈. 캐시 있으면 즉시 'ready', 없으면 prefetch 시작.
   */
  const handleShare = () => {
    if (!detail) return
    if (typeof navigator.share !== 'function') {
      setToast(
        '이 브라우저는 공유 기능을 지원하지 않아요. 다운로드 후 직접 공유해주세요.',
      )
      return
    }
    // 사용자 gesture 컨텍스트에서 권한 prompt — 처음 1회만
    void requestNotificationPermissionOnce()
    setShareModalOpen(true)
    if (cachedWatermarkFile) {
      // 캐시 hit — preparing skip 하고 바로 'ready'
      setShareStep('ready')
    } else {
      prepareShareFile()
    }
  }

  /** prefetch 본체 — 캐시 없을 때만 호출됨. 재시도 버튼에서도 사용. */
  const prepareShareFile = async () => {
    setShareStep('preparing')
    try {
      await ensureWatermarkedFile()
      setShareStep('ready')
    } catch (err) {
      console.error('[Share] prefetch 실패', err)
      setShareStep('error')
    }
  }

  /**
   * 2단계: 모달의 "공유하기" 버튼 클릭 → 이 클릭이 새 user gesture 라 navigator.share
   * 즉시 통과. await 없이 바로 호출 (file 은 캐시에서 동기적으로 꺼냄).
   */
  const handleShareConfirm = () => {
    if (!detail) return
    const shareUrl = `${window.location.origin}/videos/${detail.videoId}`
    const payload: ShareData = {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    }

    let canShareFile = false
    if (cachedWatermarkFile && typeof navigator.canShare === 'function') {
      try {
        canShareFile = navigator.canShare({ files: [cachedWatermarkFile] })
      } catch {
        canShareFile = false
      }
    }

    if (cachedWatermarkFile && canShareFile) {
      payload.files = [cachedWatermarkFile]
    } else if (cachedWatermarkFile && !canShareFile) {
      setToast('영상 파일 공유를 지원하지 않는 브라우저입니다. 링크로 공유합니다.')
    }

    navigator
      .share(payload)
      .then(() => {
        console.log('[Share] 공유 완료')
        setShareModalOpen(false)
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          // 사용자가 share sheet 닫음 — 모달은 그대로 둠 (다시 공유 가능)
          return
        }
        console.error('[Share] navigator.share 실패', err)
        setToast(
          '공유에 실패했어요: ' +
            (err instanceof Error ? err.message : '알 수 없는 오류'),
        )
      })
  }

  // ── 로딩 / 에러 ──
  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-sm text-white/80">{error ?? '데이터가 없습니다.'}</p>
        <button
          type="button"
          onClick={() => navigate('/videos')}
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur"
        >
          내 영상으로
        </button>
      </div>
    )
  }

  return (
    // 명시적 dvh 기반 height 으로 viewport 안에 강제 fit.
    //  - AppHeader 약 3.75rem (py-3 + h-9 + border)
    //  - 모바일: BottomNav 영역 5rem + env(safe-area)
    //  - 데스크톱: BottomNav 없음 (SideNav 사용) → md:에서는 BottomNav 분량 제외
    //
    // flex chain (flex-1 + min-h-0) 만으론 <video> 같은 replaced element 의 h-full 이
    // 안정적으로 해석 안 됨 (parent height 이 계산값이라 % 가 0 으로 fallback).
    <div className="flex h-[calc(100dvh-3.75rem-5rem-env(safe-area-inset-bottom,0))] flex-col overflow-hidden md:h-[calc(100dvh-3.75rem)]">
      {/* 비디오 플레이어 — flex-1 로 남은 공간만 차지, 영상은 absolute inset-0 + object-contain 으로 letterbox */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        <AuthedVideo
          src={detail.videoUrl}
          className="absolute inset-0 h-full w-full object-contain"
          controls
        />

        {/* 제목 — 영상 위 상단 카드 형태로 (가독성 강화) */}
        <div className="pointer-events-none absolute left-4 right-16 top-4 z-10">
          <div className="inline-flex max-w-full flex-col gap-1 rounded-2xl bg-black/55 px-4 py-2.5 backdrop-blur-md">
            <h1 className="break-all text-base font-extrabold leading-tight text-white sm:text-lg">
              {detail.originFileName || detail.title}
            </h1>
            <p className="text-[11px] font-medium text-white/75">
              {formatDate(detail.createdAt)}
            </p>
          </div>
        </div>

        {/* 다운로드 — 우상단 (다운로드 중에는 진행률 표시) */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          aria-label="영상 워터마크 다운로드"
          className={`absolute right-3 top-3 z-10 flex items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/60 disabled:opacity-90 ${
            downloading && downloadProgress !== null
              ? 'h-10 gap-1.5 px-3'
              : 'h-10 w-10'
          }`}
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {downloadProgress !== null && (
                <span className="text-xs font-bold">
                  {Math.round(downloadProgress)}%
                </span>
              )}
            </>
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 액션 버튼 — 시각 가중치 오름차순: 편집 < SNS < 공유 (primary) */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleEdit}
            className="group flex flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-2 py-3 text-xs font-semibold text-gray-800 transition hover:border-brand-200 hover:bg-brand-50 active:scale-[0.98] sm:flex-row sm:gap-2 sm:py-3.5 sm:text-base"
          >
            <Pencil className="h-4 w-4 text-gray-500 transition group-hover:text-brand-500" />
            편집하기
          </button>
          <button
            type="button"
            onClick={() => setSocialOpen(true)}
            className="group flex flex-col items-center justify-center gap-1 rounded-2xl border border-brand-200 bg-brand-50 px-2 py-3 text-xs font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-100 active:scale-[0.98] sm:flex-row sm:gap-2 sm:py-3.5 sm:text-base"
          >
            <Send className="h-4 w-4" />
            SNS 업로드
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="group flex flex-col items-center justify-center gap-1 rounded-2xl bg-linear-to-br from-brand-500 to-orange-600 px-2 py-3 text-xs font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98] sm:flex-row sm:gap-2 sm:py-3.5 sm:text-base"
          >
            <Share2 className="h-4 w-4" />
            공유하기
          </button>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900/95 px-5 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-md">
          {toast}
        </div>
      )}

      {/* 워터마크 처리 중 — 풀스크린 로딩 모달 */}
      {watermarkLoading && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-3xl bg-white px-10 py-8 text-center shadow-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />
            <p className="mt-4 text-base font-bold text-gray-900">
              워터마크 삽입 중
            </p>
            <p className="mt-1 text-sm text-gray-500">잠시만 기다려주세요...</p>
          </div>
        </div>
      )}

      {/* SNS 업로드 모달 — detail 로딩 후만 마운트 */}
      <SocialUploadModal
        videoId={detail.videoId}
        defaultTitle={detail.originFileName || detail.title}
        isOpen={socialOpen}
        onClose={() => setSocialOpen(false)}
      />

      {/* 공유 준비 모달 — preparing/ready/error 3 step.
          Chrome user-gesture 정책 회피 위해 모달 안의 "공유하기" 버튼이 진짜 share 트리거 */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-7 pb-5 text-center">
              {shareStep === 'preparing' && (
                <>
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />
                  <p className="mt-4 text-base font-bold text-gray-900">
                    공유 준비 중
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    영상에 워터마크를 입히고 있어요...
                  </p>
                </>
              )}
              {shareStep === 'ready' && (
                <>
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                    <Share2 className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-base font-bold text-gray-900">
                    공유 준비 완료
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    아래 버튼을 눌러 SNS·메신저로 영상을 보내세요.
                  </p>
                </>
              )}
              {shareStep === 'error' && (
                <>
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <Share2 className="h-6 w-6" />
                  </span>
                  <p className="mt-4 text-base font-bold text-gray-900">
                    준비 실패
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    영상 준비에 실패했어요. 다시 시도해주세요.
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
              >
                닫기
              </button>
              {shareStep === 'ready' && (
                <button
                  type="button"
                  // 이 onClick 이 새 user gesture — navigator.share 즉시 호출 가능
                  onClick={handleShareConfirm}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-linear-to-br from-brand-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-orange-600"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  공유하기
                </button>
              )}
              {shareStep === 'error' && (
                <button
                  type="button"
                  onClick={prepareShareFile}
                  className="flex-1 rounded-xl bg-linear-to-br from-brand-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-orange-600"
                >
                  다시 시도
                </button>
              )}
              {shareStep === 'preparing' && (
                <button
                  type="button"
                  disabled
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-200 px-4 py-3 text-sm font-semibold text-gray-500"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  준비 중...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso
  }
}

