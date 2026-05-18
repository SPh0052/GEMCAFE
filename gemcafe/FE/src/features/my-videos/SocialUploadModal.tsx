import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  Send,
  Video,
  X,
} from 'lucide-react'
import { subscribeJobStream } from '@/shared/lib/jobStream'
import { requestNotificationPermissionOnce } from '@/shared/lib/notify'
import {
  requestSocialUpload,
  requestWatermarkDownload,
  type PlatformResult,
  type SocialPlatform,
} from './api'

interface Props {
  videoId: number
  /** 모달 열릴 때 title 기본값 (보통 영상 originFileName 또는 fileName) */
  defaultTitle?: string
  isOpen: boolean
  onClose: () => void
}

type Step = 'form' | 'uploading' | 'result'

interface PlatformMeta {
  key: SocialPlatform
  label: string
  Icon: typeof Video
  /** 활성 시 강조색 */
  tone: string
}

// 브랜드 아이콘이 현 lucide 버전에 없어서 의미상 가까운 범용 아이콘 사용
//   YouTube → Video (재생/영상 의미)
//   Instagram → Camera (사진/카메라 의미)
const PLATFORMS: PlatformMeta[] = [
  { key: 'youtube', label: 'YouTube', Icon: Video, tone: 'bg-rose-500' },
  {
    key: 'instagram',
    label: 'Instagram',
    Icon: Camera,
    tone: 'bg-linear-to-br from-fuchsia-500 via-pink-500 to-orange-400',
  },
]

/**
 * 영상 → SNS 자동 게시 모달.
 *
 * 3-step state machine:
 *   form        — 플랫폼 선택 + 제목·설명·태그·캡션 입력
 *   uploading   — 5~30 초 대기 (스피너)
 *   result      — 플랫폼별 성공/실패 카드
 *
 * SOC-001 (워터마크 파일 없음) 자동 회피:
 *  - 제출 시 먼저 watermark-download 한 번 호출 후 social-upload.
 *  - watermark-download 가 이미 끝나있어도 BE 가 idempotent 하게 처리해줌 (재사용).
 */
export default function SocialUploadModal({
  videoId,
  defaultTitle,
  isOpen,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('form')
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(['youtube'])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [instagramCaption, setInstagramCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<PlatformResult[]>([])

  // 모달 열릴 때마다 state 초기화 (이전 결과 잔존 방지)
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setPlatforms(['youtube'])
      setTitle(defaultTitle ?? '')
      setDescription('')
      setTags('')
      setInstagramCaption('')
      setError(null)
      setResults([])
    }
  }, [isOpen, defaultTitle])

  // ESC 키로 닫기 — uploading 중엔 닫기 차단
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'uploading') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, step, onClose])

  // 진행 중인 SSE 구독 — 모달 닫힘/언마운트 시 정리
  const jobStreamsRef = useRef<EventSource[]>([])

  if (!isOpen) return null

  const togglePlatform = (p: SocialPlatform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  const canSubmit =
    title.trim().length > 0 &&
    title.trim().length <= 100 &&
    platforms.length > 0

  // 모달 닫힐 때 진행 중인 SSE 구독 모두 정리
  useEffect(() => {
    if (!isOpen) {
      jobStreamsRef.current.forEach((es) => es.close())
      jobStreamsRef.current = []
    }
  }, [isOpen])

  // 언마운트 시 SSE 정리
  useEffect(() => {
    return () => {
      jobStreamsRef.current.forEach((es) => es.close())
      jobStreamsRef.current = []
    }
  }, [])

  const handleSubmit = async () => {
    if (!canSubmit) return
    // 사용자 gesture 컨텍스트에서 알림 권한 prompt
    void requestNotificationPermissionOnce()
    setError(null)
    setStep('uploading')
    try {
      // 1) 워터마크 파일 보장 — SOC-001 회피용 사전 호출.
      //    BE 가 이미 생성된 워터마크 있으면 캐시 활용해 빠르게 응답.
      try {
        await requestWatermarkDownload(videoId)
      } catch (err) {
        // 워터마크 단계 실패해도 일단 social-upload 시도 — BE 가 SOC-001 반환하면 그때 처리.
        console.warn(
          '[SNS] watermark-download 선행 호출 실패, social-upload 그대로 시도',
          err,
        )
      }

      // 2) 본 요청
      const data = await requestSocialUpload(videoId, {
        platforms,
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(tags.trim() ? { tags: tags.trim() } : {}),
        ...(instagramCaption.trim()
          ? { instagramCaption: instagramCaption.trim() }
          : {}),
      })
      console.log('[POST /videos/{id}/social-upload] response:', data)
      setResults(data.results)
      setStep('result')

      // 각 플랫폼의 jobId 별로 SSE 구독 — 작업 종료 시 PWA 알림 자동 발송.
      // 모달이 닫히거나 unmount 되면 위 useEffect 에서 일괄 close.
      data.results.forEach((r) => {
        if (!r.jobId) return
        const platformLabel =
          PLATFORMS.find((p) => p.key === r.platform)?.label ?? r.platform
        const es = subscribeJobStream({
          jobId: r.jobId,
          notificationTitle: `${platformLabel} 업로드 완료`,
          notificationBody: `"${title.trim()}" 영상이 ${platformLabel}에 게시됐어요.`,
          notificationUrl: `/videos/${videoId}`,
        })
        jobStreamsRef.current.push(es)
      })
    } catch (err) {
      console.error('[POST /videos/{id}/social-upload] error:', err)
      setStep('form')
      setError(extractErrorMessage(err))
    }
  }

  return (
    <div
      className="fixed inset-0 z-70 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={() => step !== 'uploading' && onClose()}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-orange-500 text-white shadow-sm">
              <Send className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                SNS 업로드
              </h2>
              <p className="text-[11px] text-gray-500">
                {step === 'form' && '플랫폼과 제목을 입력해주세요'}
                {step === 'uploading' && '업로드 중... 5~30초 소요'}
                {step === 'result' && '업로드 결과'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={step === 'uploading'}
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* 본문 — step 별 분기 */}
        <div className="max-h-[70dvh] overflow-y-auto px-5 py-5">
          {step === 'form' && (
            <div className="space-y-4">
              {/* 플랫폼 체크 */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  플랫폼
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PLATFORMS.map(({ key, label, Icon, tone }) => {
                    const active = platforms.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePlatform(key)}
                        className={`group flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                          active
                            ? `border-transparent text-white shadow-md ${tone}`
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                        {active && (
                          <Check className="ml-auto h-3.5 w-3.5" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="오늘의 케이크 #shorts"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                  <span>YouTube · Instagram 공통</span>
                  <span>{title.length}/100</span>
                </div>
              </div>

              {/* YouTube 설명 (선택) — YouTube 가 platforms 에 있을 때만 노출 */}
              {platforms.includes('youtube') && (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      YouTube 설명{' '}
                      <span className="font-normal text-gray-400 normal-case">
                        (선택)
                      </span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={5000}
                      placeholder="영상 설명…"
                      rows={3}
                      className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      YouTube 태그{' '}
                      <span className="font-normal text-gray-400 normal-case">
                        (쉼표 구분)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="shorts,cake,cafe"
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </>
              )}

              {/* Instagram 캡션 (선택) — Instagram 이 platforms 에 있을 때만 */}
              {platforms.includes('instagram') && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Instagram 캡션{' '}
                    <span className="font-normal text-gray-400 normal-case">
                      (선택 — 생략 시 제목 사용)
                    </span>
                  </label>
                  <textarea
                    value={instagramCaption}
                    onChange={(e) => setInstagramCaption(e.target.value)}
                    rows={3}
                    placeholder="#cafe #cake ✨"
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              )}

              {/* 영상 권장 사양 안내 */}
              <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
                <span>
                  Shorts/Reels 권장 사양: 세로 9:16 · 60초 이하. 미충족 시
                  플랫폼이 업로드를 거부할 수 있어요.
                </span>
              </div>

              {/* 에러 */}
              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-center text-sm font-medium text-rose-600">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === 'uploading' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
              <div className="text-center">
                <p className="text-base font-bold text-gray-900">업로드 중</p>
                <p className="mt-1 text-sm text-gray-500">
                  영상 크기에 따라 5~30초 정도 걸려요.
                </p>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-3">
              {results.map((r) => {
                const meta = PLATFORMS.find((p) => p.key === r.platform)
                const Icon = meta?.Icon ?? Send
                return (
                  <div
                    key={r.platform}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                      r.success
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                        r.success ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    >
                      {r.success ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                        <Icon className="h-3.5 w-3.5 text-gray-500" />
                        {meta?.label ?? r.platform}
                      </div>
                      {r.success ? (
                        <p className="mt-0.5 break-all text-[11px] text-gray-500">
                          {r.jobId ? `Job: ${r.jobId}` : '처리 중'}
                        </p>
                      ) : (
                        <p className="mt-0.5 break-all text-[11px] text-rose-700">
                          {r.reason ?? '실패 사유 미상'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 푸터 — step 별 버튼 */}
        <footer className="flex gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          {step === 'form' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-linear-to-br from-brand-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none"
              >
                <Send className="h-3.5 w-3.5" />
                업로드
              </button>
            </>
          )}
          {step === 'uploading' && (
            <button
              type="button"
              disabled
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-200 px-4 py-3 text-sm font-semibold text-gray-500"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              업로드 중...
            </button>
          )}
          {step === 'result' && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-linear-to-br from-brand-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-brand-600 hover:to-orange-600"
            >
              완료
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

/** BE 응답 에러 메시지 추출 — error code 별 사용자 친화적 메시지로 매핑 */
function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    const data = err.response?.data as { code?: string; message?: string } | undefined
    // 우선 BE 에러 코드 별 매핑 (있을 때)
    switch (data?.code) {
      case 'SOC-001':
        return '워터마크 영상이 아직 준비되지 않았어요. 다운로드/공유를 한 번 눌러서 워터마크 영상을 만든 뒤 다시 시도해주세요.'
      case 'SOC-002':
        return 'SNS 업로드 서비스에 연결할 수 없어요. 잠시 후 다시 시도해주세요.'
      case 'SOC-003':
        return '업로드 처리 중 오류가 발생했어요.'
      case 'SOC-004':
        return '지원하지 않는 플랫폼이에요.'
      case 'VIDEO-001':
        return '영상을 찾을 수 없어요.'
      case 'VIDEO-003':
        return '영상이 아직 생성 중이에요. 완료된 뒤 다시 시도해주세요.'
      case 'AUTH-004':
        return '본인 영상이 아니라서 업로드할 수 없어요.'
    }
    // BE message fallback
    if (data?.message) return data.message
    // status 기반
    if (status === 400) return '요청 형식이 올바르지 않습니다.'
    if (status === 403) return '권한이 없습니다.'
    if (status === 404) return '영상을 찾을 수 없습니다.'
    if (status === 503) return 'SNS 업로드 서비스가 일시적으로 사용 불가합니다.'
    return '업로드에 실패했어요. 다시 시도해주세요.'
  }
  return '업로드에 실패했어요. 다시 시도해주세요.'
}
