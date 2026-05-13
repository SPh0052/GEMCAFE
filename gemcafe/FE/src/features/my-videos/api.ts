import { api } from '@/shared/lib/axios'

interface ApiResponse<T> {
  status: number
  message: string
  data: T
}

// ─── 내 영상 목록 (커서 페이지네이션) ──────────────────────────
export interface VideoListItem {
  videoId: number
  title: string
  /** 인증 보호된 썸네일 서빙 경로 (AuthedImage 로 표시) */
  thumbnailUrl: string
  createdAt: string
}

export interface VideoListPage {
  items: VideoListItem[]
  /** 다음 페이지 첫 cursor — hasNext=false 면 사용 안 함 */
  nextCursor: number | null
  hasNext: boolean
}

/**
 * 내 영상 목록 조회 (커서 페이지네이션, 무한 스크롤용).
 * GET /api/v1/videos?cursor=N&size=M
 *
 * 첫 페이지는 cursor 생략. 이후엔 이전 응답의 nextCursor 사용.
 */
export async function getMyVideos(
  cursor?: number,
  size = 12,
): Promise<VideoListPage> {
  const params: Record<string, number> = { size }
  if (cursor != null) params.cursor = cursor
  const res = await api.get<ApiResponse<VideoListPage>>('/videos', { params })
  return res.data.data
}

// ─── 영상 상세 조회 ──────────────────────────────────────────
export interface VideoDetail {
  videoId: number
  /** AI 가 생성한 영상의 원본 제목 (BE 내부용) */
  title: string
  /** 사용자에게 표시할 파일명 (예: 20260512_052543_669.mp4) */
  originFileName: string
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

// ─── 영상 편집 내용 저장 ──────────────────────────────────────
/** PATCH 의 `request` part 에 들어갈 JSON 메타데이터 */
export interface UpdateVideoMeta {
  /** 변경할 제목/파일명 */
  title?: string
}

/** PATCH 응답 — VideoDetail 과 거의 같지만 createdAt 대신 updatedAt */
export interface UpdatedVideo {
  videoId: number
  title: string
  thumbnailUrl: string
  videoUrl: string
  updatedAt: string
}

/**
 * 영상 편집 내용 저장.
 * PATCH /api/v1/videos/{videoId} (multipart/form-data)
 *
 * - `request`: 메타데이터 JSON (제목 등)
 * - `videoFile`: (선택) 편집본 영상 파일 교체
 * - `thumbnail`: (선택) 썸네일 이미지 교체
 *
 * 메타만 바꿀 때도 videoFile/thumbnail 생략 가능.
 */
export async function updateVideo(
  videoId: number,
  options: {
    request?: UpdateVideoMeta
    videoFile?: Blob | File
    thumbnail?: Blob | File
  },
): Promise<UpdatedVideo> {
  const form = new FormData()

  if (options.request) {
    // BE 는 @ModelAttribute / @RequestParam 방식으로 top-level 폼 필드를 직접 읽음.
    // 콘솔 변형 테스트로 확정: `title` 폼 필드만 보내면 200 OK.
    // JSON Blob 으로 nested `request` part 보내면 400 "title: 제목은 필수입니다" 발생.
    for (const [key, value] of Object.entries(options.request)) {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value))
      }
    }
  }
  // BE 룰 (MR feat/BE/video-edit 참고):
  //  - videoFile / thumbnail 은 둘 다 보내거나 둘 다 생략. 한쪽만 보내면 INVALID_REQUEST.
  //  - videoFile: 확장자 .mp4 + Content-Type "video/mp4" 정확 매칭 필요
  //    (MediaRecorder 의 `video/mp4;codecs=avc1.42e01e,mp4a.40.2` 같은 codec spec 거부)
  //  - thumbnail: 확장자 jpg/jpeg/png + image/* MIME
  const sendFiles = !!(options.videoFile && options.thumbnail)
  if (sendFiles) {
    // codec spec 제거하고 순수 "video/mp4" 로 재포장
    const videoBlob = new Blob([options.videoFile!], { type: 'video/mp4' })
    form.append('videoFile', videoBlob, 'video.mp4')

    // 썸네일은 image/jpeg 그대로 (canvas.toBlob 결과)
    const thumbType = options.thumbnail!.type.startsWith('image/')
      ? options.thumbnail!.type
      : 'image/jpeg'
    const thumbBlob = new Blob([options.thumbnail!], { type: thumbType })
    const thumbExt = thumbType === 'image/png' ? 'png' : 'jpg'
    form.append('thumbnail', thumbBlob, `thumb.${thumbExt}`)
  }

  // 디버그 — multipart 내용 콘솔 출력 (저장 실패 원인 추적용)
  if (import.meta.env.DEV) {
    const dump: Record<string, string> = {}
    form.forEach((v, k) => {
      if (v instanceof Blob) {
        dump[k] = `Blob(${v.type || 'no-type'}, ${v.size}B${
          v instanceof File ? `, name=${v.name}` : ''
        })`
      } else {
        dump[k] = String(v)
      }
    })
    console.log('[PATCH /videos/{id}] FormData:', dump)
  }

  // Content-Type 헤더 명시하지 않음 — axios 가 FormData 감지 후 boundary 포함된
  // 정확한 multipart/form-data 헤더를 자동 생성해줌. 수동 지정 시 boundary 누락 위험.
  const res = await api.patch<ApiResponse<UpdatedVideo>>(
    `/videos/${videoId}`,
    form,
  )
  return res.data.data
}

// ─── 워터마크 다운로드 ──────────────────────────────────────
export interface WatermarkDownload {
  /** 워터마크 처리된 영상 다운로드 URL */
  downloadUrl: string
  /** 다운로드 시 사용할 파일명 */
  fileName: string
  /** 파일 크기 (bytes) */
  fileSize: number
}

/**
 * 워터마크 다운로드 요청.
 * POST /api/v1/videos/{videoId}/watermark-download
 *
 * BE 에서 워터마크를 합성한 영상의 downloadUrl 을 반환.
 * 이 URL 로 GET 하면 워터마크된 영상 binary 를 받을 수 있음.
 *
 * 다운로드·공유 등 사용자가 영상 파일을 외부로 내보내는 모든 경로에서
 * 원본 videoUrl 대신 이 API 의 downloadUrl 을 사용해야 워터마크가 들어감.
 */
export async function requestWatermarkDownload(
  videoId: number,
): Promise<WatermarkDownload> {
  const res = await api.post<ApiResponse<WatermarkDownload>>(
    `/videos/${videoId}/watermark-download`,
  )
  return res.data.data
}
