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
 * 영상에서 워터마크 검증.
 * POST /api/v1/watermark/verify  (multipart/form-data, field: file)
 */
export async function verifyWatermark(file: File): Promise<VerifyResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<ApiResponse<VerifyResult>>(
    '/watermark/verify',
    formData,
    { timeout: 600_000 }, // 영상 처리라 10분까지 대기
  )
  return res.data.data
}
