import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Download, Loader2, Pencil, Send, Share2 } from 'lucide-react'
import { AuthedVideo } from '@/shared/components/AuthedMedia'
import { api } from '@/shared/lib/axios'
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
   * 공유용 사전 준비된 mp4 File.
   *
   * Chrome 은 navigator.share 호출이 user gesture 컨텍스트 안에 있어야 함 (await 한 번이라도
   * 거치면 gesture 만료 → NotAllowedError). 그래서 detail 로드되자마자 워터마크 + blob 을
   * 미리 받아두고, 사용자가 공유 클릭하면 await 없이 즉시 share 호출.
   */
  const [preparedShareFile, setPreparedShareFile] = useState<File | null>(null)
  /** preload 진행/실패 상태 (실패 시 클릭 시점에 재시도) */
  const [sharePrepareError, setSharePrepareError] = useState(false)

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

  // 공유용 mp4 사전 prefetch — detail 로드 직후 시작.
  // Chrome 의 user gesture 정책 (NotAllowedError) 회피용. 사용자가 공유 클릭 시점엔
  // preparedShareFile 이 이미 채워져 있어서 await 없이 navigator.share 호출 가능.
  useEffect(() => {
    if (!detail) return
    let cancelled = false
    setPreparedShareFile(null)
    setSharePrepareError(false)
    ;(async () => {
      try {
        const meta = await requestWatermarkDownload(detail.videoId)
        if (cancelled) return
        console.log('[Share][prefetch] watermark meta:', meta)
        const blob = await fetchVideoBlob(meta.downloadUrl)
        if (cancelled) return
        const file = new File([blob], meta.fileName, {
          type: blob.type || 'video/mp4',
        })
        setPreparedShareFile(file)
        console.log('[Share][prefetch] file ready:', {
          size: file.size,
          type: file.type,
        })
      } catch (err) {
        if (cancelled) return
        console.warn('[Share][prefetch] 실패 — 공유 클릭 시 재시도', err)
        setSharePrepareError(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.videoId])

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
   * 워터마크 처리 + blob 반환. 로딩 모달 표시는 호출자가 관리.
   * 원본 영상이 외부로 나가지 않도록 모든 외부 export 가 이 함수를 거침.
   */
  const fetchWatermarkedBlob = async (): Promise<{
    blob: Blob
    fileName: string
  }> => {
    if (!detail) throw new Error('영상 정보 없음')
    const meta = await requestWatermarkDownload(detail.videoId)
    console.log('[POST /videos/.../watermark-download] response:', meta)
    const blob = await fetchVideoBlob(meta.downloadUrl)
    return { blob, fileName: meta.fileName }
  }

  /**
   * 다운로드: 워터마크 합성 → 로컬 저장.
   */
  const handleDownload = async () => {
    if (!detail || downloading) return
    setDownloading(true)
    setDownloadProgress(null)
    setWatermarkLoading(true)
    try {
      const { blob, fileName } = await fetchWatermarkedBlob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = fileName || `${detail.originFileName || 'gemcafe'}.mp4`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objUrl)
      setToast('다운로드를 시작했어요.')
    } catch (err) {
      console.error('[VideoDetail] 워터마크 다운로드 실패', err)
      setToast('다운로드에 실패했습니다.')
    } finally {
      setWatermarkLoading(false)
      setDownloading(false)
    }
  }

  /**
   * 공유: 사전 prefetch 된 mp4 File 을 Web Share API 로 즉시 공유.
   *
   * Chrome 정책상 navigator.share 는 user gesture 컨텍스트 안에서만 동작 → 클릭 핸들러
   * 시작 시점에 await 없이 바로 호출해야 함. preload 가 끝났으면 즉시 share, 안 끝났으면
   * 클릭이 'gesture' 로 카운트되는 동안 다시 시도하라고 안내.
   */
  const handleShare = () => {
    if (!detail) return

    if (typeof navigator.share !== 'function') {
      setToast(
        '이 브라우저는 공유 기능을 지원하지 않아요. 다운로드 후 직접 공유해주세요.',
      )
      return
    }

    // Preload 가 아직 진행 중이거나 실패한 경우 — share 호출 X (gesture 의미 없음).
    if (!preparedShareFile) {
      if (sharePrepareError) {
        // 실패한 케이스: 재시도 트리거. detail.videoId 변경 effect 로 재실행되진 않으니
        // 강제로 한 번 더 prefetch 시도.
        setSharePrepareError(false)
        ;(async () => {
          try {
            const meta = await requestWatermarkDownload(detail.videoId)
            const blob = await fetchVideoBlob(meta.downloadUrl)
            const file = new File([blob], meta.fileName, {
              type: blob.type || 'video/mp4',
            })
            setPreparedShareFile(file)
            setToast('공유 준비가 끝났어요. 공유 버튼을 다시 눌러주세요.')
          } catch (err) {
            console.error('[Share] 재시도 prefetch 실패', err)
            setSharePrepareError(true)
            setToast('영상 준비에 실패했어요. 잠시 후 다시 시도해주세요.')
          }
        })()
      } else {
        setToast('영상 공유 준비 중이에요. 잠시 후 다시 눌러주세요.')
      }
      return
    }

    const payload: ShareData = {
      files: [preparedShareFile],
      title: shareTitle,
      text: shareText,
    }

    if (
      typeof navigator.canShare === 'function' &&
      !navigator.canShare(payload)
    ) {
      console.warn('[Share] canShare(file) false')
      setToast(
        '이 기기에서는 영상 파일 공유를 지원하지 않아요. 우상단 ↓ 버튼으로 다운로드 후 직접 공유해주세요.',
      )
      return
    }

    // await 없이 바로 호출 — gesture 컨텍스트 유지.
    navigator
      .share(payload)
      .then(() => console.log('[Share] 공유 완료'))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
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

