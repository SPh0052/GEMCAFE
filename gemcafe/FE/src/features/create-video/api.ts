import { api } from '@/shared/lib/axios'

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/** AI 호출은 BE 처리 시간이 길어 axios 기본 30s timeout 으로 부족 — 개별 호출에 적용. */
const AI_TIMEOUT_MS = 180_000

// ─── Step 2. 케이크 이미지 분석 ──────────────────────────────────
export interface CakeAnalysis {
  /**
   * BE 가 내려주는 분석 결과 — key/value 쌍.
   * value 는 단일 string 또는 string 배열일 수 있음 (예: { fruit: ["strawberry"] }).
   */
  [key: string]: string | string[]
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

// ─── Step 7. 키프레임 생성 ─────────────────────────────────────
export interface KeyframeRequest {
  simulationId: number
  backgroundId: number
  /** analyze 결과에서 선택한 키 (또는 값) */
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
    { timeout: AI_TIMEOUT_MS },
  )
  return res.data.data
}

// ─── Step 7-③. 키프레임 선택 ──────────────────────────────────
export interface SelectKeyframeResult {
  sessionId: number
  selectedKeyframeId: number
  status: string
}

/**
 * 영상 생성에 사용할 키프레임 확정.
 * POST /api/v1/cakes/sessions/{sessionId}/select-keyframe
 */
export async function selectKeyframe(
  sessionId: number,
  keyframeId: number,
): Promise<SelectKeyframeResult> {
  const res = await api.post<ApiResponse<SelectKeyframeResult>>(
    `/cakes/sessions/${sessionId}/select-keyframe`,
    { keyframeId },
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
  /** 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' 등 BE 정의값 */
  status: string
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
