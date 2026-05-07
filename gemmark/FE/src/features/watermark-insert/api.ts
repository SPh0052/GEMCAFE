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

export interface VideoListItem {
  id: number
  /** 워터마크 콘텐츠 UUID. 상세 조회 path 파라미터로 사용. */
  contentUuid: string
  name: string
  type: string
  size: number
  createdAt: string
}

export interface VideoListResponse {
  items: VideoListItem[]
  total: number
  page: number
  size: number
}

export interface VideoDetail {
  name: string
  processingTime: number
  processingFps: number
  embedPsnr: number
  payloadBits: number
  businessId: string
  contentUuid: string
  createdAt: string
  watermarkHex: string
}

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

/**
 * 워터마크 삽입 영상 목록 조회.
 * GET /api/v1/videos?page=1&size=20
 * Authorization 헤더는 axios 요청 인터셉터가 자동 첨부.
 */
export async function listVideos(
  page = 1,
  size = 20,
): Promise<VideoListResponse> {
  const res = await api.get<ApiResponse<VideoListResponse>>('/videos', {
    params: { page, size },
  })
  return res.data.data
}

/**
 * 워터마크 삽입 영상 상세 조회.
 * GET /api/v1/videos/{uuid}
 * uuid: 목록 조회 응답의 item.id 값.
 */
export async function getVideoDetail(uuid: string): Promise<VideoDetail> {
  const res = await api.get<ApiResponse<VideoDetail>>(
    `/videos/${encodeURIComponent(uuid)}`,
  )
  return res.data.data
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
 * POST /api/v1/watermark/embed  (application/x-www-form-urlencoded, fields: videoId, alpha)
 * alpha: 워터마크 강도 (1~20)
 */
export async function embedWatermark(
  videoId: string,
  alpha: number,
): Promise<EmbedResult> {
  const params = new URLSearchParams()
  params.append('videoId', videoId)
  params.append('alpha', String(alpha))

  const res = await api.post<ApiResponse<EmbedResult>>(
    '/watermark/embed',
    params,
    { timeout: 600_000 }, // 워터마크 삽입은 영상 처리라 10분까지 대기
  )
  return res.data.data
}

/**
 * 워터마크 삽입된 영상 파일 다운로드.
 * GET /api/v1/watermark/{videoId}/download
 * 응답은 영상 파일 바이너리 (Blob).
 */
export async function downloadWatermarkedVideo(
  videoId: string,
): Promise<Blob> {
  const res = await api.get(`/watermark/${videoId}/download`, {
    responseType: 'blob',
    timeout: 600_000, // 큰 영상 파일 대비 10분
  })
  return res.data as Blob
}

/**
 * Blob을 브라우저 다운로드로 트리거.
 * 임시 a 태그 생성 → click → 정리.
 */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
