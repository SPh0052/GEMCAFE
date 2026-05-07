import { api, resolveFileUrl } from '@/shared/lib/axios'

export interface VerifyResult {
  isWatermarked: boolean
  videoUuid: string
  businessId: string
  createdAt: string
  ber: number
}

/**
 * 검증 이력 목록의 한 항목 (GET /verifications 응답)
 */
export interface VerificationListItem {
  id: number
  videoWatermarkedId: number
  status: string
  originalFileName: string
  fileSize: number
  durationSec: number
  thumbnailUrl: string
  createdAt: string
}

export interface VerificationListResponse {
  items: VerificationListItem[]
  total: number
  page: number
  size: number
}

/**
 * 검증 이력 상세 (GET /verifications/{id} 응답)
 */
export interface VerificationDetail {
  id: number
  status: string
  accuracy: number
  extractDuration: number
  createdAt: string
  videoWatermarkedId: number
  originalFileName: string
  storedFileName: string
  thumbnailUrl: string
  fileType: string
  fileSize: number
  durationSec: number
  embedPsnr: number
  alpha: number
  watermarkHex: string
  contentUuid: string
  embedProcessingTime: number
  embedProcessingFps: number
  embeddedAt: string
  businessId: string
  payloadBits: number
}

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/**
 * 워터마크 검증.
 * POST /api/v1/watermark/verify
 * application/x-www-form-urlencoded — field 'videoId', 값은 업로드 후 받은 videoId 문자열
 */
export async function verifyWatermark(videoId: string): Promise<VerifyResult> {
  const params = new URLSearchParams()
  params.append('videoId', videoId)

  const res = await api.post<ApiResponse<VerifyResult>>(
    '/watermark/verify',
    params,
    { timeout: 600_000 }, // 영상 처리라 10분까지 대기
  )
  return res.data.data
}

/**
 * 워터마크 검증 이력 목록 조회.
 * GET /api/v1/verifications?page=1&size=20[&q=]
 *
 * - q: 파일명 검색어. 비어있으면 query에서 빠짐.
 *   (BE가 지원 안 하면 무시되고 전체 목록이 옴)
 * authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function listVerifications(opts?: {
  page?: number
  size?: number
  q?: string
}): Promise<VerificationListResponse> {
  const { page = 1, size = 20, q } = opts ?? {}
  const params: Record<string, string | number> = { page, size }
  if (q && q.trim()) params.q = q.trim()

  const res = await api.get<ApiResponse<VerificationListResponse>>(
    '/verifications',
    { params },
  )
  const data = res.data.data
  // BE가 thumbnailUrl을 상대 경로(/files/...)로 내려주므로 절대 URL로 변환.
  // 변환 안 하면 dev 환경에서 FE origin으로 요청 가서 404.
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      thumbnailUrl: resolveFileUrl(item.thumbnailUrl) ?? '',
    })),
  }
}

/**
 * 워터마크 검증 이력 상세 조회.
 * GET /api/v1/verifications/{verification_id}
 */
export async function getVerificationDetail(
  verificationId: number | string,
): Promise<VerificationDetail> {
  const res = await api.get<ApiResponse<VerificationDetail>>(
    `/verifications/${encodeURIComponent(String(verificationId))}`,
  )
  const data = res.data.data
  return {
    ...data,
    thumbnailUrl: resolveFileUrl(data.thumbnailUrl) ?? '',
  }
}
