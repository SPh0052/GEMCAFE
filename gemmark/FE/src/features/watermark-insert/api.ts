import { api } from '@/shared/lib/axios'

export interface UploadedVideo {
  videoId: string
  originalFilename: string
  fileSize: number
  mimeType: string
  uploadedAt: string
}

export interface EmbedResult {
  success: boolean
  processingTime: number
  psnr: number
  watermarkHex: string
  contentUuid: string
  timestamp: string
}

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/**
 * 영상 파일 업로드.
 * POST /api/v1/videos/upload  (multipart/form-data, field: videoName)
 */
export async function uploadVideo(file: File): Promise<UploadedVideo> {
  const formData = new FormData()
  formData.append('videoName', file)

  const res = await api.post<ApiResponse<UploadedVideo>>(
    '/videos/upload',
    formData,
  )
  return res.data.data
}

/**
 * 업로드된 영상에 워터마크 삽입.
 * POST /api/v1/watermark/embed  (application/x-www-form-urlencoded, field: videoId)
 */
export async function embedWatermark(videoId: string): Promise<EmbedResult> {
  const params = new URLSearchParams()
  params.append('videoId', videoId)

  const res = await api.post<ApiResponse<EmbedResult>>(
    '/watermark/embed',
    params,
    { timeout: 600_000 }, // 워터마크 삽입은 영상 처리라 10분까지 대기
  )
  return res.data.data
}
