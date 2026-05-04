import { api } from '@/shared/lib/axios'

/**
 * 강건성 테스트 대상 영상 목록(기간 필터) 한 항목.
 *
 * 백엔드 응답 정확한 스키마가 아직 확정 전이라 일부 필드는 옵셔널로 둠.
 * 실제 응답 들어오는 거 보고 필요 없는 필드 제거 / 누락 필드 추가하면 됨.
 */
export interface RobustnessVideoItem {
  id: number
  contentUuid?: string
  name: string
  type?: string
  size?: number
  createdAt?: string
  /** 마지막 강건성 테스트 결과 — 백엔드가 어떤 enum을 줄지 모름. 문자열로 받음. */
  lastTestResult?: string | null
}

export interface RobustnessVideoListResponse {
  items: RobustnessVideoItem[]
  total: number
  page: number
  size: number
}

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/**
 * 강건성 테스트용 영상 목록 조회 (기간 필터).
 * GET /api/v1/robustness?page=&size=&startDate=&endDate=
 *
 * 파라미터는 모두 query string.
 * - page: 1-base, 기본 1
 * - size: 1~100, 기본 20
 * - startDate / endDate: 'YYYY-MM-DD' (inclusive). 옵셔널.
 *
 * authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function listRobustnessVideos(opts: {
  page?: number
  size?: number
  startDate?: string
  endDate?: string
}): Promise<RobustnessVideoListResponse> {
  const { page = 1, size = 20, startDate, endDate } = opts
  const params: Record<string, string | number> = { page, size }
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate

  const res = await api.get<ApiResponse<RobustnessVideoListResponse>>(
    '/robustness',
    { params },
  )
  return res.data.data
}

/**
 * 강건성 테스트 실행 응답.
 *
 * 백엔드 응답 스키마가 명시되지 않아 일부 필드는 옵셔널로 둠.
 * 실제 응답에서 확인되면 좁히면 됨.
 */
export interface RunRobustnessResponse {
  /** 백엔드가 testId 를 반환한다고 가정. 키 명이 다르면 매핑 보정 필요. */
  testId?: string | number
  id?: string | number
  status?: string
  startedAt?: string
  [k: string]: unknown
}

/**
 * 강건성 테스트 실행.
 * POST /api/v1/robustness/run
 *
 * Request body (JSON):
 *   { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
 *
 * 응답으로 받은 testId 로 상세 페이지 이동.
 * authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function runRobustnessTest(body: {
  startDate: string
  endDate: string
}): Promise<RunRobustnessResponse> {
  const res = await api.post<ApiResponse<RunRobustnessResponse>>(
    '/robustness/run',
    body,
    { timeout: 600_000 }, // 영상 처리 시작 응답이 늦게 올 수 있어 10분 대기
  )
  return res.data.data
}
