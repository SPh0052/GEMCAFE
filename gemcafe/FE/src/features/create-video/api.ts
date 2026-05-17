import { api } from '@/shared/lib/axios'

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/** AI 호출은 BE 처리 시간이 길어 axios 기본 30s timeout 으로 부족 — 개별 호출에 적용. */
const AI_TIMEOUT_MS = 180_000
const KEYFRAME_TIMEOUT_MS = 300_000

// ─── Step 2. 케이크 이미지 분석 ──────────────────────────────────
/**
 * BE 가 내려주는 분석 결과.
 * FE 는 suggested_focus 만 사용자에게 노출 (사용자가 강조할 포인트 선택).
 * 나머지 필드는 BE 가 키프레임/영상 생성 시 내부적으로 사용.
 */
export interface CakeAnalysis {
  cake_type?: string
  base?: string[]
  creams?: string[]
  toppings?: string[]
  coating?: string
  key_feature?: string
  is_warm?: boolean
  is_layered?: boolean
  /** 사용자에게 태그로 보여줄 강조 포인트 후보 목록. */
  suggested_focus?: string[]
  /** 추가 필드 호환용. */
  [key: string]: unknown
}

export interface AnalyzeResult {
  sessionId: number
  analysis: CakeAnalysis
}

/**
 * 케이크 이미지 분석.
 * POST /api/v1/cakes/analyze (multipart/form-data, field name: image)
 */
export async function analyzeCakeImage(file: File): Promise<AnalyzeResult> {
  const form = new FormData()
  form.append('image', file)
  const res = await api.post<ApiResponse<AnalyzeResult>>(
    '/cakes/analyze',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: AI_TIMEOUT_MS,
    },
  )
  return res.data.data
}

// ─── 진행 중 세션 목록 조회 ─────────────────────────────────────
export type InProgressStatus =
  | 'ANALYZED'
  | 'KEYFRAMING'
  | 'READY_TO_GENERATE'
  | 'GENERATING'
  | 'VIDEO_GENERATING'
  | 'SUBMITTED'
  | string

export interface InProgressSession {
  sessionId: number
  status: InProgressStatus
  createdAt: string
  inputImage: {
    fileName: string
    /** 인증 보호 경로일 수 있음 — 카드 썸네일로 사용. AuthedImage 권장 */
    url: string
  }
  /** SUBMITTED 상태일 때 영상 생성 진행 상황을 `/creating` 페이지에서 조회용. */
  videoId?: number | null
}

export interface InProgressList {
  items: InProgressSession[]
  total: number
}

/**
 * 진행 중 세션 목록 조회 — 영상 생성 진입 전 (ANALYZED / KEYFRAMING / READY_TO_GENERATE) 세션만.
 * GET /api/v1/cakes/sessions/in-progress
 *
 * 사용자가 영상 생성 도중 이탈한 세션을 카드로 보여주고 재진입 (이어서 만들기) 시키는 용도.
 */
export async function getInProgressSessions(): Promise<InProgressList> {
  const res = await api.get<ApiResponse<InProgressList>>(
    '/cakes/sessions/in-progress',
  )
  return res.data.data
}

// ─── 세션 상세 조회 (이어서 만들기 복원용) ─────────────────────
export interface SessionKeyframe {
  keyframeId: number
  attemptNumber: number
  keyframeUrl: string
  baseUrl?: string | null
  frameStrategy?: string | null
  videoPrompt?: string | null
  seed?: number | null
  metadata?: Record<string, unknown> | null
  isSelected: boolean
  createdAt: string
}

export interface SessionSelections {
  simulationCode?: string | null
  backgroundCode?: string | null
  focus?: string | null
  hint?: string | null
}

export interface UpdateSessionSelectionsRequest {
  simulationCode: string | null
  backgroundCode: string | null
  focus: string | null
  hint: string
}

export interface SessionDetail {
  sessionId: number
  status: string
  createdAt: string
  expiresAt: string
  expiresInSec: number
  keyframeAttempts: number
  videoId?: number | null
  inputImage: {
    fileName: string
    url: string
  }
  crossSectionFileName?: string | null
  analysis?: Record<string, unknown> | null
  selections?: SessionSelections | null
  videoPromptKr?: string | null
  selectedKeyframeId?: number | null
  keyframes: SessionKeyframe[]
}

/**
 * 세션 상세 조회 — 재진입 시 이전 작업 상태 복원용.
 * GET /api/v1/cakes/sessions/{sessionId}
 *
 * 모든 필드 반환 (null 컬럼은 null 그대로). FE 는 selections / videoPromptKr /
 * keyframes / selectedKeyframeId 만으로 화면 복원.
 */
export async function getSessionDetail(
  sessionId: number,
): Promise<SessionDetail> {
  const res = await api.get<ApiResponse<SessionDetail>>(
    `/cakes/sessions/${sessionId}`,
  )
  return res.data.data
}

/**
 * 인증 보호된 이미지 URL 을 axios 로 받아 blob URL 로 변환.
 *
 * BE 가 sessions detail 등에서 내려주는 `/api/v1/files/...` 절대 경로는
 * `<img src>` 에 직접 박으면 dev proxy 매핑 안 되고 인증 헤더도 안 가서 404.
 * axios 통과시키면 인터셉터가 baseURL + Authorization 자동 처리.
 *
 * 호출자는 컴포넌트 unmount 시 `URL.revokeObjectURL()` 로 해제 필요 (메모리 누수 방지).
 */
export async function fetchAuthedImageAsBlobUrl(url: string): Promise<string> {
  const res = await api.get<Blob>(url, { responseType: 'blob' })
  return URL.createObjectURL(res.data)
}

// ─── Step 4. 자동 프롬프트 생성 ─────────────────────────────────
export interface PreviewPromptRequest {
  simulationCode: string
  /** 배경 미선택 시 null. */
  backgroundCode: string | null
  focus: string
  hint: string
}

export interface PreviewPromptResult {
  /** LLM 이 생성한 한국어 영상 묘사. */
  videoPromptKr: string
}

/**
 * 자동 프롬프트 생성 (stateless).
 * POST /api/v1/cakes/sessions/{sessionId}/preview-prompts
 *
 * 사용자 선택값(simulation/background/focus/hint)을 바탕으로 LLM 이
 * 한국어 영상 묘사를 생성. 사용자가 그대로 쓰거나 추가 편집해서 hint 로 보낼 수 있음.
 */
export async function generatePreviewPrompt(
  sessionId: number,
  body: PreviewPromptRequest,
): Promise<PreviewPromptResult> {
  const res = await api.post<ApiResponse<PreviewPromptResult>>(
    `/cakes/sessions/${sessionId}/preview-prompts`,
    body,
    { timeout: AI_TIMEOUT_MS },
  )
  return res.data.data
}

export async function updateSessionSelections(
  sessionId: number,
  body: UpdateSessionSelectionsRequest,
): Promise<void> {
  await api.patch(`/cakes/sessions/${sessionId}/selections`, body)
}

export async function updateVideoPrompt(
  sessionId: number,
  videoPromptKr: string,
  hint: string,
): Promise<void> {
  await api.patch(`/cakes/sessions/${sessionId}/video-prompt`, {
    videoPromptKr,
    hint,
  })
}

// ─── Step 7. 키프레임 생성 ─────────────────────────────────────
export interface KeyframeRequest {
  /** 시뮬레이션 카탈로그 키 (예: 'smash', 'fork_bite') */
  simulationCode: string
  /** 배경 카탈로그 키 (예: 'white_marble', 'cafe_interior'). 미선택 시 null. */
  backgroundCode: string | null
  /** 분석 결과에서 사용자가 고른 강조 키워드 (예: 'baked_cheese', 'strawberry') */
  focus: string
  /** 유저가 입력한 자유 프롬프트 */
  hint: string
}

export interface KeyframeResult {
  keyframeId: number
  attemptNumber: number
  keyframeUrl: string
}

/**
 * 키프레임 생성. 재생성 시 동일 엔드포인트 재호출. 최대 3회.
 * POST /api/v1/cakes/sessions/{sessionId}/keyframes
 */
export async function generateKeyframe(
  sessionId: number,
  body: KeyframeRequest,
): Promise<KeyframeResult> {
  const res = await api.post<ApiResponse<KeyframeResult>>(
    `/cakes/sessions/${sessionId}/keyframes`,
    body,
    { timeout: KEYFRAME_TIMEOUT_MS },
  )
  return res.data.data
}

// ─── Step 7-③. 키프레임 선택 ──────────────────────────────────
export interface SelectKeyframeRequest {
  keyframeId: number
  /** 영상 생성에 사용할 한국어 영상 묘사 (자동 생성 + 사용자 편집 결과) */
  videoPromptKr: string
}

export interface SelectKeyframeResult {
  sessionId: number
  selectedKeyframeId: number
  status: string
}

/**
 * 영상 생성에 사용할 키프레임 확정 + videoPromptKr 저장.
 * POST /api/v1/cakes/sessions/{sessionId}/select-keyframe
 */
export async function selectKeyframe(
  sessionId: number,
  body: SelectKeyframeRequest,
): Promise<SelectKeyframeResult> {
  const res = await api.post<ApiResponse<SelectKeyframeResult>>(
    `/cakes/sessions/${sessionId}/select-keyframe`,
    body,
  )
  return res.data.data
}

// ─── Step 8. 영상 생성 시작 ────────────────────────────────────
export interface CreateVideoResult {
  videoId: number
  sessionId: number
  status: string
  gemUsed: number
}

/**
 * 영상 생성 시작. 젬 6 차감 후 비동기 큐 발행.
 * POST /api/v1/videos
 */
export async function createVideo(
  sessionId: number,
  userPrompt: string,
): Promise<CreateVideoResult> {
  const res = await api.post<ApiResponse<CreateVideoResult>>('/videos', {
    sessionId,
    userPrompt,
  })
  return res.data.data
}

// ─── 영상 상태 폴링 ────────────────────────────────────────────
export interface VideoStatus {
  videoId: number
  /** 'GENERATING' | 'COMPLETED' | 'FAILED' */
  status: string
  /** COMPLETED 시 파일명. /dev/files/gemcafe/ai-videos/{storedFileName} 로 접근. */
  storedFileName?: string
  thumbnailFileName?: string
  fileSize?: number
  createdAt?: string
}

/**
 * 영상 생성 진행 상태 조회 (폴링용).
 * GET /api/v1/videos/{videoId}/status
 */
export async function getVideoStatus(videoId: number): Promise<VideoStatus> {
  const res = await api.get<ApiResponse<VideoStatus>>(
    `/videos/${videoId}/status`,
  )
  return res.data.data
}

// ─── 영상 파일 URL 헬퍼 ────────────────────────────────────────
/** AuthedVideo / AuthedImage 에 넘길 영상 파일 경로 생성. */
export function videoFileUrl(storedFileName: string): string {
  return `/dev/files/gemcafe/ai-videos/${storedFileName}`
}

/** AuthedImage 에 넘길 썸네일 파일 경로 생성. */
export function videoThumbnailUrl(thumbnailFileName: string): string {
  return `/dev/files/gemcafe/ai-videos/thumbnails/${thumbnailFileName}`
}

// ─── 영상 다운로드 / 공유 메타 ─────────────────────────────────
export interface VideoDownloadInfo {
  videoId: number
  fileUrl: string
  originFileName: string
  fileSize: number
}

/**
 * 영상 다운로드 메타 조회 (원본 파일명 포함).
 * GET /api/v1/videos/{videoId}/download
 */
export async function getVideoDownloadInfo(
  videoId: number,
): Promise<VideoDownloadInfo> {
  const res = await api.get<ApiResponse<VideoDownloadInfo>>(
    `/videos/${videoId}/download`,
  )
  return res.data.data
}

export interface VideoShareInfo {
  videoId: number
  videoUrl: string
  thumbnailUrl: string
  title: string
}

/**
 * 영상 공유 메타 조회 (제목·썸네일 포함, navigator.share 용).
 * GET /api/v1/videos/{videoId}/share
 */
export async function getVideoShareInfo(
  videoId: number,
): Promise<VideoShareInfo> {
  const res = await api.get<ApiResponse<VideoShareInfo>>(
    `/videos/${videoId}/share`,
  )
  return res.data.data
}
