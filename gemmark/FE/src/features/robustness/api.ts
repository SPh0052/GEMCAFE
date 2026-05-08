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
  // BE 가 testId 와 IN_PROGRESS 상태를 즉시 반환하고 실제 처리는 백그라운드에서 진행 →
  // 별도 timeout 늘리지 않고 axios 인스턴스 default(30초) 사용. 상세 페이지에서 폴링.
  const res = await api.post<ApiResponse<RunRobustnessResponse>>(
    '/robustness/run',
    body,
  )
  return res.data.data
}

/**
 * 강건성 테스트 이력 한 항목 (GET /robustness/history 응답).
 */
export interface RobustnessHistoryItem {
  testId: number
  /** 검색 기간 시작 (YYYY-MM-DD) */
  startDate: string
  /** 검색 기간 종료 (YYYY-MM-DD) */
  endDate: string
  totalCount: number
  successCount: number
  failCount: number
  /** 실행한 관리자 식별자 */
  admin: string
  /** 실제 테스트가 실행된 시각 (ISO datetime) */
  testDate: string
}

/**
 * 강건성 테스트 이력 조회.
 * GET /api/v1/robustness/history
 *
 * 페이지네이션 없음 — 전체 배열로 반환.
 * authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function listRobustnessHistory(): Promise<RobustnessHistoryItem[]> {
  const res = await api.get<ApiResponse<RobustnessHistoryItem[]>>(
    '/robustness/history',
  )
  return res.data.data
}

/**
 * 강건성 테스트 상세 응답의 실패 영상 한 항목.
 */
export interface RobustnessFailedVideo {
  id: number
  fileName: string
  alpha: number
  /** 통과 여부. failedVideos 안에 있으니 보통 false 지만 BE가 보낸 값을 그대로 사용. */
  passed: boolean
}

/**
 * 강건성 테스트 상세 (GET /robustness/tests/{test_id} 응답).
 */
export interface RobustnessTestDetail {
  startDate: string
  endDate: string
  admin: string
  totalCount: number
  successCount: number
  failCount: number
  /** 평균 BER (단위: %). */
  avgBer: number
  /** 평균 PSNR (단위: dB). */
  avgPsnr: number
  /** 평균 처리 시간 (단위: 초). */
  avgDuration: number
  /** 표준 편차 — BER. */
  sdBer: number
  /** 표준 편차 — PSNR. */
  sdPsnr: number
  /** 표준 편차 — 처리 시간. */
  sdDuration: number
  failedVideos: RobustnessFailedVideo[]
}

/**
 * 강건성 테스트 상세 조회.
 * GET /api/v1/robustness/tests/{test_id}
 *
 * authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function getRobustnessTestDetail(
  testId: number | string,
): Promise<RobustnessTestDetail> {
  const res = await api.get<ApiResponse<RobustnessTestDetail>>(
    `/robustness/tests/${encodeURIComponent(String(testId))}`,
  )
  return res.data.data
}

/**
 * 테스트 상세 - 영상 기본 정보 (GET /robustness/tests/{test_id}/videos/{video_id}).
 */
export interface RobustnessVideoInfo {
  videoFileName: string
  videoUuid: string
  /** 영상 생성 일자 (ISO datetime) */
  createDate: string
  /** 영상 파일 크기 (bytes) */
  fileSize: number
  /** 테스트 실시 일자 (ISO datetime) */
  testDate: string
  /** 테스트 결과 enum (예: 'SUCCESS', 'FAILED', ...) */
  testPassed: string
  /** 담당 관리자 식별자 */
  adminId: string
}

/**
 * 강건성 테스트 상세 - 영상 기본 정보 조회.
 * GET /api/v1/robustness/tests/{test_id}/videos/{video_id}
 */
export async function getRobustnessVideoInfo(
  testId: number | string,
  videoId: number | string,
): Promise<RobustnessVideoInfo> {
  const res = await api.get<ApiResponse<RobustnessVideoInfo>>(
    `/robustness/tests/${encodeURIComponent(String(testId))}/videos/${encodeURIComponent(String(videoId))}`,
  )
  return res.data.data
}

/**
 * 공격 1건의 측정값.
 */
export interface RobustnessAttackResult {
  /** 공격 종류 (예: 'H.264 재인코딩', 'JPEG압축(Q50)') */
  type: string
  /** Bit Error Rate (단위: %) */
  ber: number
  /** PSNR (단위: dB) */
  psnr: number
  /** 처리 시간 (단위: 초) */
  duration: number
}

/**
 * 테스트 상세 - 공격 유형별 결과 (GET /robustness/tests/{test_id}/videos/{video_id}/attacks).
 */
export interface RobustnessVideoAttacks {
  avgBer: number
  avgPsnr: number
  avgDuration: number
  /** 종합 점수 (0~100). */
  totalScore: number
  attacks: RobustnessAttackResult[]
}

/**
 * 강건성 테스트 상세 - 공격 유형별 결과 조회.
 * GET /api/v1/robustness/tests/{test_id}/videos/{video_id}/attacks
 */
export async function getRobustnessVideoAttacks(
  testId: number | string,
  videoId: number | string,
): Promise<RobustnessVideoAttacks> {
  const res = await api.get<ApiResponse<RobustnessVideoAttacks>>(
    `/robustness/tests/${encodeURIComponent(String(testId))}/videos/${encodeURIComponent(String(videoId))}/attacks`,
  )
  return res.data.data
}
