import { api } from '@/shared/lib/axios'

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

// ─── 영상 상세 조회 ──────────────────────────────────────────
export interface VideoDetail {
  videoId: number
  title: string
  /** 보호된 서빙 컨트롤러 경로 (Authorization 필요). AuthedImage 로 표시. */
  thumbnailUrl: string
  /** 보호된 서빙 컨트롤러 경로 (Authorization 필요). AuthedVideo 로 재생. */
  videoUrl: string
  createdAt: string
}

/**
 * 영상 상세 조회.
 * GET /api/v1/videos/{videoId}
 *
 * 반환되는 url 들은 인증 보호된 서빙 경로 — `<video src>` 직접 사용 불가.
 * AuthedVideo / AuthedImage 컴포넌트 또는 useAuthedBlobUrl 훅으로 받아야 함.
 */
export async function getVideoDetail(videoId: number): Promise<VideoDetail> {
  const res = await api.get<ApiResponse<VideoDetail>>(`/videos/${videoId}`)
  return res.data.data
}
