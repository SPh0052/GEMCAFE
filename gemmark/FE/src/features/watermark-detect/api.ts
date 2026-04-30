import { api } from '@/shared/lib/axios'

export interface VerifyResult {
  isWatermarked: boolean
  videoUuid: string
  businessId: string
  createdAt: string
  ber: number
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
